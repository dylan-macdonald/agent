/**
 * Voice API Routes
 *
 * Handles Twilio voice call webhooks and voice alarm management
 */

import { Router, Request, Response } from "express";
import { VoiceAlarmService } from "../../services/voice-alarm.js";
import { VoiceCallType } from "../../types/voice-call.js";
import { logger } from "../../utils/logger.js";

export function createVoiceRouter(
    voiceAlarmService: VoiceAlarmService
): Router {
    const router = Router();

    /**
     * GET /api/voice/alarm-twiml
     * Generate TwiML for voice alarm calls
     */
    router.get("/alarm-twiml", (req: Request, res: Response) => {
        try {
            const message = req.query.message as string || "Good morning. It is time to wake up.";
            const callId = req.query.callId as string || '';
            const type = (req.query.type as VoiceCallType) || VoiceCallType.WAKE_UP;

            const twiml = voiceAlarmService.generateAlarmTwiML(message, callId, type);

            res.set("Content-Type", "text/xml");
            return res.status(200).send(twiml);
        } catch (error) {
            logger.error("Error generating alarm TwiML", {
                error: (error as Error).message,
            });
            return res.status(500).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response><Say>An error occurred.</Say></Response>`);
        }
    });

    /**
     * POST /api/voice/alarm-response
     * Handle user response to voice alarm (speech input)
     */
    router.post("/alarm-response", async (req: Request, res: Response) => {
        try {
            const callId = req.query.callId as string;
            const speechResult = (req.body.SpeechResult || "").toLowerCase();

            logger.info("Voice alarm response received", { callId, speechResult });

            // Check if user said "I'm up" or similar acknowledgment phrases
            const acknowledgePhrases = [
                "i'm up", "im up", "i am up",
                "awake", "i'm awake", "i am awake",
                "okay", "ok", "stop",
                "yes", "got it", "thanks"
            ];
            const isAcknowledged = acknowledgePhrases.some(phrase => speechResult.includes(phrase));

            // Update the call record with acknowledgment
            if (callId) {
                await voiceAlarmService.handleAcknowledgment(callId, isAcknowledged);
            }

            // Generate response TwiML
            const twiml = voiceAlarmService.generateResponseTwiML(isAcknowledged);

            res.set("Content-Type", "text/xml");
            return res.status(200).send(twiml);
        } catch (error) {
            logger.error("Error processing alarm response", {
                error: (error as Error).message,
            });
            return res.status(500).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response><Say>An error occurred.</Say><Hangup/></Response>`);
        }
    });

    /**
     * POST /api/voice/status
     * Twilio call status callback
     */
    router.post("/status", async (req: Request, res: Response) => {
        const {
            CallSid,
            CallStatus,
            CallDuration,
            Price,
            From,
            To
        } = req.body;

        logger.info("Voice call status update", {
            callSid: CallSid,
            status: CallStatus,
            duration: CallDuration,
            price: Price,
            from: From,
            to: To,
        });

        try {
            // Update call status in database
            await voiceAlarmService.handleStatusCallback(
                CallSid,
                CallStatus,
                CallDuration ? parseInt(CallDuration) : undefined,
                Price ? parseFloat(Price) : undefined
            );

            return res.status(200).send("OK");
        } catch (error) {
            logger.error("Error handling status callback", {
                error: (error as Error).message,
                callSid: CallSid
            });
            return res.status(500).send("Error");
        }
    });

    /**
     * GET /api/voice/calls/:userId
     * Get call history for a user
     */
    router.get("/calls/:userId", async (req: Request, res: Response) => {
        try {
            const userId = req.params.userId as string;
            const limit = parseInt(req.query.limit as string) || 20;

            const calls = await voiceAlarmService.getCallHistory(userId, limit);

            return res.json({ calls });
        } catch (error) {
            logger.error("Error getting call history", {
                error: (error as Error).message,
            });
            return res.status(500).json({ error: "Failed to get call history" });
        }
    });

    /**
     * GET /api/voice/call/:callId
     * Get a specific call by ID
     */
    router.get("/call/:callId", async (req: Request, res: Response) => {
        try {
            const callId = req.params.callId as string;

            const call = await voiceAlarmService.getCallById(callId);

            if (!call) {
                return res.status(404).json({ error: "Call not found" });
            }

            return res.json({ call });
        } catch (error) {
            logger.error("Error getting call", {
                error: (error as Error).message,
            });
            return res.status(500).json({ error: "Failed to get call" });
        }
    });

    /**
     * POST /api/voice/trigger/:userId
     * Manually trigger a voice alarm (for testing or urgent notifications)
     */
    router.post("/trigger/:userId", async (req: Request, res: Response) => {
        try {
            const userId = req.params.userId as string;
            const { phoneNumber, message, type } = req.body;

            if (!phoneNumber || !message) {
                return res.status(400).json({
                    error: "Missing required fields: phoneNumber, message"
                });
            }

            const call = await voiceAlarmService.triggerAlarm(
                userId,
                phoneNumber,
                message,
                type || VoiceCallType.REMINDER
            );

            if (!call) {
                return res.status(400).json({
                    error: "Voice alarms are disabled for this user or missing credentials"
                });
            }

            return res.status(201).json({ call });
        } catch (error) {
            logger.error("Error triggering voice alarm", {
                error: (error as Error).message,
            });
            return res.status(500).json({ error: "Failed to trigger voice alarm" });
        }
    });

    return router;
}
