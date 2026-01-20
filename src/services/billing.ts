import { Pool } from "pg";
import crypto from "crypto";
import { logger } from "../utils/logger.js";

export interface ApiKeyData {
  provider: string;
  isConfigured: boolean;
  maskedKey?: string;
  lastUpdated?: string;
}

export interface ProviderBalance {
  provider: string;
  balance?: number;
  used?: number;
  limit?: number;
  unit: string;
  lastChecked?: string;
  error?: string;
}

interface OpenAIBillingResponse {
  total_available?: number;
  total_used?: number;
}

interface ElevenLabsSubscriptionResponse {
  character_count?: number;
  character_limit?: number;
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

export class BillingService {
  constructor(private db: Pool) {}

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'));
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  private decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    const ivHex = parts[0] as string;
    const authTagHex = parts[1] as string;
    const encrypted = parts[2] as string;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'));

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
    return decrypted;
  }

  private maskKey(key: string): string {
    if (key.length <= 8) return '****';
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  }

  async getApiKeys(userId: string): Promise<ApiKeyData[]> {
    const result = await this.db.query(
      `SELECT provider, encrypted_key, updated_at
       FROM user_api_keys
       WHERE user_id = $1`,
      [userId]
    );

    const providers = ['anthropic', 'openai', 'twilio', 'elevenlabs'];
    const keysMap: Record<string, ApiKeyData> = {};

    // Initialize all providers as not configured
    providers.forEach(p => {
      keysMap[p] = { provider: p, isConfigured: false };
    });

    // Update with actual data
    result.rows.forEach((row: { provider: string; encrypted_key: string; updated_at: Date }) => {
      try {
        const decrypted = this.decrypt(row.encrypted_key);
        keysMap[row.provider] = {
          provider: row.provider,
          isConfigured: true,
          maskedKey: this.maskKey(decrypted),
          lastUpdated: row.updated_at.toISOString()
        };
      } catch {
        keysMap[row.provider] = {
          provider: row.provider,
          isConfigured: false
        };
      }
    });

    return Object.values(keysMap);
  }

  async saveApiKey(userId: string, provider: string, apiKey: string): Promise<void> {
    const encrypted = this.encrypt(apiKey);

    await this.db.query(
      `INSERT INTO user_api_keys (user_id, provider, encrypted_key, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, provider)
       DO UPDATE SET encrypted_key = $3, updated_at = NOW()`,
      [userId, provider, encrypted]
    );

    logger.info("API key saved", { userId, provider });
  }

  async deleteApiKey(userId: string, provider: string): Promise<void> {
    await this.db.query(
      `DELETE FROM user_api_keys WHERE user_id = $1 AND provider = $2`,
      [userId, provider]
    );

    logger.info("API key deleted", { userId, provider });
  }

  async getDecryptedKey(userId: string, provider: string): Promise<string | null> {
    const result = await this.db.query(
      `SELECT encrypted_key FROM user_api_keys WHERE user_id = $1 AND provider = $2`,
      [userId, provider]
    );

    if (result.rows.length === 0) return null;

    try {
      return this.decrypt(result.rows[0].encrypted_key);
    } catch {
      return null;
    }
  }

  async getBalances(userId: string): Promise<ProviderBalance[]> {
    const balances: ProviderBalance[] = [];
    const providers = ['anthropic', 'openai', 'twilio', 'elevenlabs'];

    for (const provider of providers) {
      const apiKey = await this.getDecryptedKey(userId, provider);
      if (!apiKey) continue;

      try {
        const balance = await this.fetchProviderBalance(provider, apiKey);
        balances.push(balance);
      } catch {
        balances.push({
          provider,
          unit: 'USD',
          error: 'Failed to fetch balance'
        });
      }
    }

    return balances;
  }

  async refreshBalance(userId: string, provider: string): Promise<ProviderBalance> {
    const apiKey = await this.getDecryptedKey(userId, provider);
    if (!apiKey) {
      return { provider, unit: 'USD', error: 'API key not configured' };
    }

    return this.fetchProviderBalance(provider, apiKey);
  }

  private async fetchProviderBalance(provider: string, apiKey: string): Promise<ProviderBalance> {
    switch (provider) {
      case 'anthropic':
        return this.fetchAnthropicBalance();
      case 'openai':
        return this.fetchOpenAIBalance(apiKey);
      case 'twilio':
        return this.fetchTwilioBalance();
      case 'elevenlabs':
        return this.fetchElevenLabsBalance(apiKey);
      default:
        return { provider, unit: 'USD', error: 'Unknown provider' };
    }
  }

  private fetchAnthropicBalance(): ProviderBalance {
    // Anthropic doesn't have a public balance API
    return {
      provider: 'anthropic',
      unit: 'USD',
      lastChecked: new Date().toISOString(),
      error: 'Balance check not available - track usage in Anthropic Console'
    };
  }

  private async fetchOpenAIBalance(apiKey: string): Promise<ProviderBalance> {
    try {
      const res = await fetch('https://api.openai.com/v1/dashboard/billing/credit_grants', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        return {
          provider: 'openai',
          unit: 'USD',
          lastChecked: new Date().toISOString(),
          error: 'Balance check requires dashboard access - check OpenAI Console'
        };
      }

      const data = await res.json() as OpenAIBillingResponse;
      return {
        provider: 'openai',
        balance: data.total_available || 0,
        used: data.total_used || 0,
        unit: 'USD',
        lastChecked: new Date().toISOString()
      };
    } catch {
      return {
        provider: 'openai',
        unit: 'USD',
        lastChecked: new Date().toISOString(),
        error: 'Could not fetch balance'
      };
    }
  }

  private fetchTwilioBalance(): ProviderBalance {
    // Twilio requires Account SID + Auth Token
    return {
      provider: 'twilio',
      unit: 'USD',
      lastChecked: new Date().toISOString(),
      error: 'Balance check requires Account SID + Auth Token - check Twilio Console'
    };
  }

  private async fetchElevenLabsBalance(apiKey: string): Promise<ProviderBalance> {
    try {
      const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
        headers: {
          'xi-api-key': apiKey
        }
      });

      if (!res.ok) {
        throw new Error('Failed to fetch subscription');
      }

      const data = await res.json() as ElevenLabsSubscriptionResponse;
      return {
        provider: 'elevenlabs',
        used: data.character_count || 0,
        limit: data.character_limit || 10000,
        unit: 'characters',
        lastChecked: new Date().toISOString()
      };
    } catch {
      return {
        provider: 'elevenlabs',
        unit: 'characters',
        lastChecked: new Date().toISOString(),
        error: 'Could not fetch usage'
      };
    }
  }
}
