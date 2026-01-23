import { Router, Request, Response } from "express";

import { VoiceAlarmService } from "../../services/voice-alarm.js";
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

            const twiml = voiceAlarmService.generateAlarmTwiML(message);

            res.set("Content-Type", "text/xml");
            return res.status(200).send(twiml);
        } catch (error) {
            logger.error("Error generating alarm TwiML", {
                error: (error as Error).message,
            });
            return res.status(500).send("<Response><Say>An error occurred.</Say></Response>");
        }
    });

    /**
     * POST /api/voice/alarm-response
     * Handle user response to voice alarm (speech input)
     */
    router.post("/alarm-response", (req: Request, res: Response) => {
        try {
            const speechResult = (req.body.SpeechResult || "").toLowerCase();

            logger.info("Voice alarm response received", { speechResult });

            // Check if user said "I'm up" or similar
            const dismissPhrases = ["i'm up", "im up", "i am up", "awake", "okay", "ok", "stop"];
            const isDismissed = dismissPhrases.some(phrase => speechResult.includes(phrase));

            if (isDismissed) {
                // User acknowledged
                const twiml = `
                <Response>
                    <Say voice="alice">Great! Have a wonderful day. Goodbye.</Say>
                    <Hangup/>
                </Response>`;
                res.set("Content-Type", "text/xml");
                return res.status(200).send(twiml);
            }

            // User didn't acknowledge properly, prompt again
            const twiml = `
            <Response>
                <Say voice="alice">I didn't catch that. Please say "I am up" to stop the alarm.</Say>
                <Gather input="speech" action="/api/voice/alarm-response" timeout="10">
                    <Say voice="alice">Say "I am up" when you're ready.</Say>
                </Gather>
                <Say voice="alice">I will try again in a few minutes. Goodbye for now.</Say>
            </Response>`;
            res.set("Content-Type", "text/xml");
            return res.status(200).send(twiml);
        } catch (error) {
            logger.error("Error processing alarm response", {
                error: (error as Error).message,
            });
            return res.status(500).send("<Response><Say>An error occurred.</Say><Hangup/></Response>");
        }
    });

    /**
     * POST /api/voice/status
     * Twilio call status callback
     */
    router.post("/status", (req: Request, res: Response) => {
        const { CallSid, CallStatus, From, To } = req.body;

        logger.info("Voice call status update", {
            callSid: CallSid,
            status: CallStatus,
            from: From,
            to: To,
        });

        // Could trigger retry logic here if call failed
        if (CallStatus === "no-answer" || CallStatus === "busy") {
            logger.warn("Voice alarm call was not answered", { callSid: CallSid });
            // TODO: Could schedule a retry here
        }

        return res.status(200).send("OK");
    });

    return router;
}
