import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, desktopCapturer } from "electron";
import * as path from "path";
import { fileURLToPath } from "url";
import log from "electron-log";
import { io, Socket } from "socket.io-client";
import { AudioManager, AudioState } from "./audio/manager.js";

// Handle ES modules in Electron
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let tray: Tray | null = null;
let settingsWindow: BrowserWindow | null = null;
let mainWindow: BrowserWindow | null = null; // Invisible window for audio playback
let socket: Socket | null = null;
let audioManager: AudioManager | null = null;

// Configuration
const BACKEND_URL = process.env.ASSISTANT_BACKEND_URL || "http://localhost:3001";
const USER_ID = process.env.ASSISTANT_USER_ID || "default-user";
const DEVICE_ID = "desktop-agent-1";
const PICOVOICE_KEY = process.env.PICOVOICE_ACCESS_KEY || "";

function setupSocket() {
  log.info(`Connecting to backend at ${BACKEND_URL}...`);

  socket = io(BACKEND_URL, {
    query: {
      userId: USER_ID,
      deviceId: DEVICE_ID,
    },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    log.info("Connected to backend");
    updateTrayStatus("Connected");
  });

  socket.on("disconnect", () => {
    log.warn("Disconnected from backend");
    updateTrayStatus("Disconnected");
  });

  socket.on("transcript", (data: { text: string; messageId: string }) => {
    log.info(`Received transcript: ${data.text}`);
    // Ideally show a notification or toast
  });

  // Handle incoming audio response
  socket.on("voice-response", (audioBuffer: ArrayBuffer) => {
    log.info(`Received voice response: ${audioBuffer.byteLength} bytes`);
    if (audioManager) audioManager.setState(AudioState.PLAYING);
    playAudio(audioBuffer);
  });

  // Handle screen capture request
  socket.on("capture-screen", async (data: { requestId: string }) => {
    log.info(`Received screen capture request: ${data.requestId}`);
    try {
      const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } });
      const primarySource = sources[0]; // Assuming first source is primary
      if (primarySource) {
        const pngBuffer = primarySource.thumbnail.toPNG();
        log.info(`Captured screen: ${pngBuffer.length} bytes`);
        socket?.emit("screen-captured", {
          requestId: data.requestId,
          image: pngBuffer
        });
      } else {
        log.error("No screen sources found");
        socket?.emit("screen-capture-error", { requestId: data.requestId, error: "No screen sources found" });
      }
    } catch (error: any) {
      log.error(`Screen capture failed: ${error.message}`);
      socket?.emit("screen-capture-error", { requestId: data.requestId, error: error.message });
    }
  });

  socket.on("error", (data: { message: string }) => {
    log.error(`Socket error: ${data.message}`);
  });
}

function playAudio(buffer: ArrayBuffer) {
  if (!mainWindow) return;
  // Send to renderer to play
  mainWindow.webContents.send("play-audio", Buffer.from(buffer));
}

function setupAudio() {
  if (!PICOVOICE_KEY) {
    log.error("PICOVOICE_ACCESS_KEY is missing. Voice features disabled.");
    return;
  }

  audioManager = new AudioManager(PICOVOICE_KEY);
  audioManager.init();

  // Wire events
  audioManager.on("wake-word", () => {
    log.info("Wake word detected! Notifying backend...");
    socket?.emit("wake-word");
    updateTrayStatus("Listening...");
  });

  audioManager.on("state-change", (state: AudioState) => {
    log.info(`Audio state changed: ${state}`);
    updateTrayStatus(state);
    // Inform renderer if needed for UI
    mainWindow?.webContents.send("audio-state", state);

    // If state went back to IDLE (e.g. after playback), maybe resume listening?
    // Implementation decision: Auto-resume listening after playback? 
    // For now, let's keep it simple. If it was PLAYING and finishes, we might want to go back to IDLE or LISTENING_WAKE.
  });

  audioManager.on("audio-data", (chunk: Buffer) => {
    if (socket?.connected) {
      socket.emit("voice-data", chunk);
    }
  });
}

function updateTrayStatus(status: string) {
  if (tray) {
    const contextMenu = Menu.buildFromTemplate([
      { label: "AI Assistant", enabled: false },
      { type: "separator" },
      { label: `Status: ${status}`, id: "status" },
      {
        label: "Enable Voice",
        type: "checkbox",
        checked: audioManager ? true : false, // roughly
        click: toggleVoice,
      },
      { type: "separator" },
      { label: "Settings", click: () => settingsWindow?.show() },
      {
        label: "Quit", click: () => {
          audioManager?.stop();
          app.quit();
        }
      },
    ]);
    tray.setContextMenu(contextMenu);
    tray.setToolTip(`AI Assistant: ${status}`);
  }
}

function createSettingsWindow() {
  settingsWindow = new BrowserWindow({
    width: 400,
    height: 600,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  settingsWindow.loadFile(path.join(__dirname, "ui/settings.html"));

  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });
}

// Invisible window for handling audio playback/web APIs
function createMainWindow() {
  mainWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // For internal logic simplicity, or use preload
    }
  });

  // We can load a simple dummy HTML or re-use settings. 
  // Let's load a minimal file for audio playback.
  mainWindow.loadFile(path.join(__dirname, "ui/audio.html"));

  // When playback finishes (logic needs to be in renderer), it could send IPC back
  ipcMain.on("playback-finished", () => {
    log.info("Playback finished");
    if (audioManager) {
      audioManager.setState(AudioState.IDLE);
      // Auto-resume listening?
      audioManager.start();
    }
  });
}

function createTray() {
  const icon = nativeImage.createFromPath(
    path.join(__dirname, "assets/icon.png")
  );
  tray = new Tray(icon);
  updateTrayStatus("Idle");
}

function toggleVoice(menuItem: any) {
  const enabled = menuItem.checked;
  log.info(`Voice features ${enabled ? "enabled" : "disabled"}`);

  if (enabled) {
    if (!audioManager) setupAudio();
    audioManager?.start();
  } else {
    audioManager?.stop();
  }
}

app.whenReady().then(() => {
  createSettingsWindow();
  createMainWindow();
  createTray();
  setupSocket();
  setupAudio(); // Initialize audio manager but maybe don't start recording immediately until user says so, or start if config says so.

  // Auto-start for now
  audioManager?.start();

  log.info("Desktop Agent started");
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // Keep running in tray
  }
});

// IPC Handlers
ipcMain.handle("get-status", () => ({
  isListening: audioManager ? true : false, // Simplified
  version: app.getVersion(),
}));

