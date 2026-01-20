/**
 * Voice Service
 *
 * Coordinates audio transcription, synthesis, and voice privacy
 */

import type { Pool } from "pg";

import { encrypt, decrypt } from "../security/encryption.js";
import { NotFoundError, ValidationError } from "../types/index.js";
import {
  VoiceMessage,
  VoiceMessageDirection,
  VoiceMessageStatus,
  VoicePrivacySettings,
  IVoiceProvider,
} from "../types/voice.js";
import { logger } from "../utils/logger.js";

interface VoicePrivacySettingsRow {
  user_id: string;
  voice_enabled: boolean;
  retention_days: number;
  auto_delete_transcripts: boolean;
  updated_at: Date;
}

interface VoiceMessageRow {
  id: string;
  user_id: string;
  direction: VoiceMessageDirection;
  status: VoiceMessageStatus;
  audio_url?: string;
  transcript?: string;
  duration_ms?: number;
  provider_name?: string;
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export class VoiceService {
  constructor(
    private db: Pool,
    private sttProvider: IVoiceProvider,
    private ttsProvider: IVoiceProvider
  ) { }

  /**
   * Get voice privacy settings for a user
   */
  async getPrivacySettings(userId: string): Promise<VoicePrivacySettings> {
    const query = "SELECT * FROM voice_privacy_settings WHERE user_id = $1";
    const result = await this.db.query(query, [userId]);

    if (result.rows.length === 0) {
      // Return defaults
      return {
        userId,
        voiceEnabled: false,
        retentionDays: 30,
        autoDeleteTranscripts: true,
        updatedAt: new Date(),
      };
    }

    const row = result.rows[0] as VoicePrivacySettingsRow;
    return {
      userId: row.user_id,
      voiceEnabled: row.voice_enabled,
      retentionDays: row.retention_days,
      autoDeleteTranscripts: row.auto_delete_transcripts,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Update voice privacy settings
   */
  async updatePrivacySettings(
    userId: string,
    settings: Partial<VoicePrivacySettings>
  ): Promise<VoicePrivacySettings> {
    const _current = await this.getPrivacySettings(userId);
    const _updated = { ..._current, ...settings };

    const query = `
      INSERT INTO voice_privacy_settings (user_id, voice_enabled, retention_days, auto_delete_transcripts, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        voice_enabled = EXCLUDED.voice_enabled,
        retention_days = EXCLUDED.retention_days,
        auto_delete_transcripts = EXCLUDED.auto_delete_transcripts,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await this.db.query(query, [
      userId,
      _updated.voiceEnabled,
      _updated.retentionDays,
      _updated.autoDeleteTranscripts,
    ]);

    const row = result.rows[0] as VoicePrivacySettingsRow;
    await this.logVoiceAction(userId, "update_privacy", { settings: _updated });

    return {
      userId: row.user_id,
      voiceEnabled: row.voice_enabled,
      retentionDays: row.retention_days,
      autoDeleteTranscripts: row.auto_delete_transcripts,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Process inbound voice message (audio -> transcript)
   */
  async processInboundVoice(
    userId: string,
    audioBuffer: Buffer
  ): Promise<VoiceMessage> {
    const settings = await this.getPrivacySettings(userId);
    if (!settings.voiceEnabled) {
      throw new ValidationError("Voice features are disabled for this user");
    }

    // Create record
    const message = await this.createVoiceMessage({
      userId,
      direction: VoiceMessageDirection.INBOUND,
      status: VoiceMessageStatus.TRANSCRIBING,
    });

    try {
      // Transcribe
      const transcription = await this.sttProvider.transcribe(audioBuffer);

      // Update record with encrypted transcript
      const encryptedTranscript = encrypt(transcription.text);

      await this.updateVoiceMessage(message.id, {
        status: VoiceMessageStatus.COMPLETED,
        transcript: encryptedTranscript,
        durationMs: Math.round(transcription.duration * 1000),
        providerName: this.sttProvider.name,
      });

      return await this.getVoiceMessage(message.id);
    } catch (error) {
      await this.updateVoiceMessage(message.id, {
        status: VoiceMessageStatus.FAILED,
        metadata: { error: (error as Error).message },
      });
      throw error;
    }
  }

  /**
   * Process outbound voice message (text -> audio)
   */
  async processOutboundVoice(
    userId: string,
    text: string,
    voiceId?: string
  ): Promise<{ message: VoiceMessage; audioBuffer: Buffer }> {
    const settings = await this.getPrivacySettings(userId);
    if (!settings.voiceEnabled) {
      throw new ValidationError("Voice features are disabled for this user");
    }

    // Create record
    const message = await this.createVoiceMessage({
      userId,
      direction: VoiceMessageDirection.OUTBOUND,
      status: VoiceMessageStatus.SYNTHESIZING,
      transcript: encrypt(text),
    });

    try {
      // Synthesize
      const synthesis = await this.ttsProvider.synthesize(text, voiceId);

      await this.updateVoiceMessage(message.id, {
        status: VoiceMessageStatus.READY,
        providerName: this.ttsProvider.name,
      });

      const updatedMessage = await this.getVoiceMessage(message.id);

      return {
        message: updatedMessage,
        audioBuffer: synthesis.audioBuffer,
      };
    } catch (error) {
      await this.updateVoiceMessage(message.id, {
        status: VoiceMessageStatus.FAILED,
        metadata: { error: (error as Error).message },
      });
      throw error;
    }
  }

  /**
   * Helper: Create voice message record
   */
  private async createVoiceMessage(
    data: Partial<VoiceMessage>
  ): Promise<VoiceMessage> {
    const query = `
      INSERT INTO voice_messages (user_id, direction, status, transcript, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      data.userId,
      data.direction,
      data.status ?? VoiceMessageStatus.PENDING,
      data.transcript ?? null,
      JSON.stringify(data.metadata ?? {}),
    ]);

    return this.mapRowToVoiceMessage(result.rows[0] as VoiceMessageRow);
  }

  /**
   * Helper: Update voice message
   */
  private async updateVoiceMessage(
    id: string,
    updates: Partial<VoiceMessage>
  ): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (updates.status) {
      fields.push(`status = $${i++}`);
      values.push(updates.status);
    }
    if (updates.transcript) {
      fields.push(`transcript = $${i++}`);
      values.push(updates.transcript);
    }
    if (updates.audioUrl) {
      fields.push(`audio_url = $${i++}`);
      values.push(updates.audioUrl);
    }
    if (updates.durationMs) {
      fields.push(`duration_ms = $${i++}`);
      values.push(updates.durationMs);
    }
    if (updates.providerName) {
      fields.push(`provider_name = $${i++}`);
      values.push(updates.providerName);
    }
    if (updates.metadata) {
      fields.push(`metadata = $${i++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    if (fields.length === 0) {
      return;
    }

    values.push(id);
    const query = `UPDATE voice_messages SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${i}`;
    await this.db.query(query, values);
  }

  /**
   * Get voice message by ID
   */
  async getVoiceMessage(id: string): Promise<VoiceMessage> {
    const query = "SELECT * FROM voice_messages WHERE id = $1";
    const result = await this.db.query(query, [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError("Voice message");
    }

    return this.mapRowToVoiceMessage(result.rows[0] as VoiceMessageRow);
  }

  /**
   * Log voice related action
   */
  private async logVoiceAction(
    userId: string,
    action: string,
    details: unknown
  ): Promise<void> {
    const query =
      "INSERT INTO voice_audit_log (user_id, action, details) VALUES ($1, $2, $3)";
    await this.db.query(query, [userId, action, JSON.stringify(details)]);
  }

  /**
   * Map database row to VoiceMessage
   */
  private mapRowToVoiceMessage(row: VoiceMessageRow): VoiceMessage {
    let transcript = row.transcript;
    if (transcript) {
      try {
        transcript = decrypt(transcript);
      } catch (error) {
        logger.error(
          `Failed to decrypt transcript for voice message ${row.id}`
        );
      }
    }

    const message: VoiceMessage = {
      id: row.id,
      userId: row.user_id,
      direction: row.direction,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    if (row.audio_url !== undefined && row.audio_url !== null) {
      message.audioUrl = row.audio_url;
    }
    if (transcript !== undefined && transcript !== null) {
      message.transcript = transcript;
    }
    if (row.duration_ms !== undefined && row.duration_ms !== null) {
      message.durationMs = row.duration_ms;
    }
    if (row.provider_name !== undefined && row.provider_name !== null) {
      message.providerName = row.provider_name;
    }
    if (row.metadata !== undefined && row.metadata !== null) {
      message.metadata = row.metadata;
    }

    return message;
  }
}
