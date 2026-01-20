import { describe, it, expect, beforeEach, vi } from "vitest";
import { SocketService } from "../../src/services/socket.js";
import { AssistantService } from "../../src/services/assistant.js";
import { VoiceService } from "../../src/services/voice.js";
import { Server as SocketServer } from "socket.io";
import { Server as HttpServer } from "http";

describe("SocketService", () => {
  let socketService: SocketService;
  let mockServer: HttpServer;
  let mockAssistantService: AssistantService;
  let mockVoiceService: VoiceService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockServer = {} as unknown as HttpServer;
    mockAssistantService = {
      handleVoiceMessage: vi.fn(),
      handleMessage: vi.fn(),
    } as unknown as AssistantService;

    mockVoiceService = {
      processInboundVoice: vi.fn(),
      processOutboundVoice: vi.fn(),
    } as unknown as VoiceService;

    // SocketServer initialization fails in tests if not careful,
    // but we can mock the whole socket.io module or just test logic.
    // For now, let's just verify it can be instantiated.

    // We'll mock SocketServer to avoid actual network binding
    vi.mock("socket.io", () => {
      return {
        Server: vi.fn().mockImplementation(() => ({
          on: vi.fn(),
          to: vi.fn().mockReturnThis(),
          emit: vi.fn(),
        })),
      };
    });

    socketService = new SocketService(
      mockServer,
      mockAssistantService,
      mockVoiceService
    );
  });

  it("should be initialized", () => {
    expect(socketService).toBeDefined();
  });

  it("should have notifyUser method", () => {
    expect(socketService.notifyUser).toBeDefined();
    socketService.notifyUser("user-1", "test-event", { data: 1 });
    // Verify it calls io.to().emit()
  });
});
