# Quickstart: Anthropic Smart Stack & Full System Setup

This guide covers setting up the complete **Anthropic Smart Stack**, including "Smart Routing", Voice Alarms, and SMS capabilities.

## 1. Automatic Setup (Recommended)
Use the included `setup.sh` script to handle dependencies, database creation, and environment configuration.

```bash
# Easy Mode (Interactive Menu)
./setup.sh

# Quick Mode (Accepts Defaults)
./setup.sh quick
```
*   **Menu Options**:
    *   `1) Quick Setup`: Installs dependencies, sets up DB, builds everything.
    *   `11) Start All Services`: Launched backend + frontend.

## 2. API Configuration (Required)

### A. Core Intelligence (Anthropic)
*Required for chat, smart routing, and web search.*
1.  Go to **Settings** > **AI Configuration**.
2.  Set Provider to **Anthropic**.
3.  Enter your **Anthropic API Key** (`sk-ant-...`).
4.  **Verification**: Ask "Are you online?" -> should reply instantly via Haiku.

### B. Voice & SMS (Twilio)
*Required for SMS reminders and Voice Alarms.*
1.  Get your **Account SID**, **Auth Token**, and **Phone Number** from the [Twilio Console](https://console.twilio.com).
2.  Go to **Settings** > **Voice & SMS Infrastructure**.
3.  Enter your **Twilio Account SID** and **Twilio Auth Token**.
4.  (Env Only) Ensure `TWILIO_PHONE_NUMBER` is set in your `.env` file (or add it via `setup.sh` environment config soon).
    *   *Note: Currently, the frontend only exposes SID/Token input. Ensure the sender number is in `.env`.*

### C. AI Voice (ElevenLabs)
*Required for high-quality Text-to-Speech.*
1.  Get your API Key from [ElevenLabs](https://elevenlabs.io).
2.  Enter it in **Settings** > **Voice & SMS Infrastructure**.

## 3. Verification Scripts
Run these scripts to test specific subsystems without using the UI.

```bash
# 1. Test LLM & Smart Router (Haiku/Sonnet switching)
npx ts-node src/scripts/verify-llm.ts

# 2. Test Check-in Scheduler & Adaptive Timing
npx ts-node src/scripts/verify-checkins.ts

# 3. Test Database & Settings Persistence
npx ts-node src/scripts/verify-settings-update.ts

# 4. Test External Tools (Web Search, Calculator)
npx ts-node src/scripts/verify-tools.ts
```

## 4. How it Works (Architecture)
-   **Smart Router**: `LlmService` uses **Claude Haiku** to judge prompt complexity.
-   **Native Web Search**: Uses Anthropic's browser tool whenever needed.
-   **Adaptive Alarms**: `CheckInScheduler` monitors `SleepService` logs to wake you up at the perfect time (via Twilio Voice).

## 5. Troubleshooting
-   **"Anthropic API key is missing"**: Check Settings.
-   **"Twilio Error"**: Check SID/Token in Settings and `TWILIO_PHONE_NUMBER` in `.env`.
-   **Database Connection**: Run `./setup.sh` option `7` (Database Setup) to reset/migrate.
