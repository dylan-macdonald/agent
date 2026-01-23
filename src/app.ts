import { createServer, Server as HttpServer } from "http";

import cors from "cors";
import express, { Express, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { Redis } from "ioredis";
import morgan from "morgan";
import { Pool } from "pg";

import { createBillingRouter } from "./api/routes/billing.js";
import { createCostRouter } from "./api/routes/cost.js";
import { createDashboardRouter } from "./api/routes/dashboard.js";
import { createLlmRoutes } from "./api/routes/llm.js";
import { createSmsRouter } from "./api/routes/sms.js";
import { createVoiceRouter } from "./api/routes/voice.js";
import { TwilioSmsProvider } from "./integrations/twilio.js";
import { ElevenLabsVoiceProvider } from "./integrations/voice/elevenlabs-provider.js";
import { OpenAiVoiceProvider } from "./integrations/voice/openai-provider.js";
import { AssistantService } from "./services/assistant.js";
import { BillingService } from "./services/billing.js";
import { LlmService } from "./services/llm.js";
import { CalendarService } from "./services/calendar.js";
import { CheckInService } from "./services/checkin.js";
import { ContextService } from "./services/context.js";
import { CostService } from "./services/cost.js";
import { SmsQueueService } from "./services/sms-queue.js";
import { SmsService } from "./services/sms.js";
import { MessageProcessor } from "./services/message-processor.js";
import { MemoryService } from "./services/memory.js";
import { PatternService } from "./services/pattern.js";
import { ConversationService } from "./services/conversation.js";
import { SocketService } from "./services/socket.js";
import { CalculatorTool } from "./services/tools/calculator.js";
import { ScriptExecutionTool } from "./services/tools/script-execution.js";
import { ToolService } from "./services/tools/tool-service.js";
import { VisionTool } from "./services/tools/vision.js";
import { WebSearchTool } from "./services/tools/web-search.js";
import { VoiceService } from "./services/voice.js";
import { ReminderService } from "./services/reminder.js";
import { ReminderScheduler } from "./services/reminder-scheduler.js";
import { CheckInScheduler } from "./services/checkin-scheduler.js";
import { VoiceAlarmService } from "./services/voice-alarm.js";
import { GoalService } from "./services/goal.js";
import { SettingsService } from "./services/settings.js";
import { AppConfig } from "./types/index.js";
import { logger } from "./utils/logger.js";
import { SleepService, WorkoutService } from "./services/health/service.js";
import { MindfulnessService } from "./services/health/mindfulness.js";

export class App {
  public express: Express;
  private server: HttpServer;
  private db!: Pool;
  private redis!: Redis;
  private smsService!: SmsService;
  private smsQueue!: SmsQueueService;
  private costService!: CostService;
  private assistantService!: AssistantService;
  private checkInService!: CheckInService;
  private checkInScheduler!: CheckInScheduler;
  private voiceAlarmService!: VoiceAlarmService;
  private goalService!: GoalService;
  private sleepService!: SleepService;
  private workoutService!: WorkoutService;
  private mindfulnessService!: MindfulnessService;
  private voiceService!: VoiceService;
  private toolService!: ToolService;
  private calendarService!: CalendarService;
  private reminderService!: ReminderService;
  private reminderScheduler!: ReminderScheduler;
  private settingsService!: SettingsService;
  private socketService!: SocketService;

  private billingService!: BillingService;
  private llmService!: LlmService;

  constructor(private config: AppConfig) {
    this.express = express();
    this.server = createServer(this.express);
    this.setupDatabase();
    this.setupRedis();
    this.setupServices();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupDatabase(): void {
    this.db = new Pool({
      connectionString: this.config.database.url,
      max: this.config.database.maxConnections,
      ssl: this.config.database.ssl ? { rejectUnauthorized: false } : false,
    });

    this.db.on("error", (err) => {
      logger.error("PostgreSQL pool error", { error: err.message });
    });
  }

  private setupRedis(): void {
    this.redis = new Redis(this.config.redis.url);
    this.redis.on("error", (err) => {
      logger.error("Redis error", { error: err.message });
    });
  }

  private setupServices(): void {
    const twilioProvider = new TwilioSmsProvider({
      name: "Twilio",
      accountId: process.env.TWILIO_ACCOUNT_SID ?? "",
      authToken: process.env.TWILIO_AUTH_TOKEN ?? "",
      fromNumber: process.env.TWILIO_PHONE_NUMBER ?? "",
    });

    this.smsQueue = new SmsQueueService(
      this.config.redis.url,
      this.db,
      twilioProvider
    );

    this.smsService = new SmsService(this.db, twilioProvider, this.smsQueue);
    this.costService = new CostService(this.db);
    this.settingsService = new SettingsService(this.db, this.redis);

    this.billingService = new BillingService(this.db);
    this.llmService = new LlmService();

    // Initialize Assistant components
    const processor = new MessageProcessor();
    const memoryService = new MemoryService(this.db, this.redis);
    const patternService = new PatternService(this.db);
    const contextService = new ContextService(
      this.db,
      memoryService,
      patternService
    );
    const conversationService = new ConversationService(this.redis);

    // Initialize Tools
    this.toolService = new ToolService(this.redis);
    this.toolService.registerTool(new WebSearchTool(this.redis, this.billingService));
    this.toolService.registerTool(new CalculatorTool());
    this.toolService.registerTool(new ScriptExecutionTool());

    this.calendarService = new CalendarService(this.db);
    this.reminderService = new ReminderService(this.db);
    this.reminderScheduler = new ReminderScheduler(this.reminderService, this.smsService);

    this.goalService = new GoalService(this.db);

    // Initialize Health services (needed by CheckInService)
    this.sleepService = new SleepService(this.db);
    this.workoutService = new WorkoutService(this.db);
    this.mindfulnessService = new MindfulnessService();

    // CheckInService now uses LLM for personalized briefings
    this.checkInService = new CheckInService(
      this.calendarService,
      this.reminderService,
      this.goalService,
      this.sleepService,
      this.workoutService,
      memoryService,
      this.smsService,
      this.llmService,
      this.billingService,
      this.settingsService
    );

    // Voice Alarm Service (requires billing for keys + public url for callbacks)
    const publicUrl = process.env.PUBLIC_URL || "http://localhost:3000";
    this.voiceAlarmService = new VoiceAlarmService(this.billingService, publicUrl);

    this.checkInScheduler = new CheckInScheduler(
      this.checkInService,
      this.db,
      this.settingsService,
      this.sleepService,
      this.voiceAlarmService
    );

    this.assistantService = new AssistantService(
      this.smsService,
      processor,
      contextService,
      memoryService,
      conversationService,
      this.toolService,
      this.calendarService,
      this.reminderService,
      this.goalService,
      this.sleepService,
      this.workoutService,

      this.mindfulnessService,
      this.llmService,
      this.settingsService,
      this.billingService
    );

    // Initialize Voice components
    const openAiApiKey = process.env.OPENAI_API_KEY || "";
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || "";

    const sttProvider = new OpenAiVoiceProvider({ apiKey: openAiApiKey });
    const ttsProvider = new ElevenLabsVoiceProvider({
      apiKey: elevenLabsApiKey,
    });

    this.voiceService = new VoiceService(this.db, sttProvider, ttsProvider);

    // Initialize Socket service
    this.socketService = new SocketService(
      this.server,
      this.assistantService,
      this.voiceService
    );

    // Register Vision Tool (requires socket service)
    this.toolService.registerTool(new VisionTool(this.socketService));
  }

  private setupMiddleware(): void {
    this.express.use(helmet());
    this.express.use(cors());
    this.express.use(
      morgan("combined", {
        stream: { write: (message) => logger.info(message.trim()) },
      })
    );
    this.express.use(express.json());
    this.express.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes(): void {
    this.express.use(express.static("public"));

    this.express.get("/health", (_req: Request, res: Response) => {
      res
        .status(200)
        .json({ status: "ok", timestamp: new Date().toISOString() });
    });

    this.express.use(
      "/api/sms",
      createSmsRouter(this.smsService, this.assistantService)
    );
    this.express.use("/api/cost", createCostRouter(this.costService));
    this.express.use("/api/billing", createBillingRouter(this.billingService));
    this.express.use("/api/llm", createLlmRoutes(this.llmService, this.billingService));

    // Dashboard API routes
    this.express.use(
      "/api/dashboard",
      createDashboardRouter(
        this.calendarService,
        this.goalService,
        this.reminderService,
        this.sleepService,
        this.workoutService,
        this.settingsService
      )
    );

    // Voice alarm TwiML routes
    this.express.use(
      "/api/voice",
      createVoiceRouter(this.voiceAlarmService)
    );
  }

  private setupErrorHandling(): void {
    this.express.use(
      (err: Error, _req: Request, res: Response, _next: NextFunction) => {
        logger.error("Unhandled API error", {
          error: err.message,
          stack: err.stack,
        });
        res.status(500).json({ error: "Internal Server Error" });
      }
    );
  }

  public getSocketService(): SocketService {
    return this.socketService;
  }

  public start(): void {
    this.smsQueue.startWorker();

    this.reminderScheduler.start();
    this.checkInScheduler.start();

    const port = this.config.port;
    this.server.listen(port, () => {
      logger.info(
        `Server running on port ${port} in ${this.config.environment} mode`
      );
    });
  }

  public async shutdown(): Promise<void> {
    logger.info("Shutting down app...");
    this.reminderScheduler.stop();
    this.checkInScheduler.stop();
    await this.smsQueue.shutdown();
    await this.db.end();
    this.redis.disconnect();
    logger.info("App shut down successfully");
  }
}
