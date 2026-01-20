import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    getStatus: () => ipcRenderer.invoke('get-status'),
    saveSettings: (settings: any) => ipcRenderer.send('save-settings', settings),
    onConnectionStatus: (callback: (connected: boolean) => void) => {
        ipcRenderer.on('connection-status', (_event, connected) => callback(connected));
    },
});
