import { Router, Request, Response } from "express";

import { AssistantService } from "../../services/assistant.js";
import { SmsService } from "../../services/sms.js";
import { ValidationError, NotFoundError } from "../../types/index.js";
import { logger } from "../../utils/logger.js";

export function createSmsRouter(
  smsService: SmsService,
  assistantService: AssistantService
): Router {
  const router = Router();

  /**
   * POST /api/sms/webhook
   * Twilio webhook for incoming messages and status updates
   */
  router.post("/webhook", async (req: Request, res: Response) => {
    try {
      const signature = req.header("x-twilio-signature");
      const protocol = req.header("x-forwarded-proto") ?? req.protocol;
      const host = req.header("x-forwarded-host") ?? req.get("host");
      const url = `${protocol}://${host}${req.originalUrl}`;

      const payload = req.body as Record<string, unknown>;

      logger.debug("Received SMS webhook", {
        signature: signature ? "present" : "absent",
        url,
        messageSid: payload.MessageSid,
      });

      // Handle status callbacks (optional)
      if (payload.SmsStatus) {
        logger.info(
          `SMS Status Update: ${payload.MessageSid} is now ${payload.SmsStatus}`
        );
        return res.status(200).send("<Response></Response>");
      }

      // Process incoming message record
      const message = await smsService.processIncomingMessage(
        payload,
        signature ?? undefined,
        url
      );

      // Trigger assistant logic asynchronously
      // We don't want to block the webhook response
      assistantService
        .handleMessage(message.userId, message.body)
        .catch((err) => {
          logger.error("Error in AssistantService.handleMessage", {
            error: (err as Error).message,
            userId: message.userId,
          });
        });

      // Return TwiML response (empty)
      res.set("Content-Type", "text/xml");
      return res.status(200).send("<Response></Response>");
    } catch (error) {
      logger.error("Error processing SMS webhook", {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });

      if (error instanceof ValidationError) {
        return res.status(403).send("Invalid signature");
      }

      if (error instanceof NotFoundError) {
        return res.status(200).send("<Response></Response>");
      }

      return res.status(500).send("Internal Server Error");
    }
  });

  return router;
}
