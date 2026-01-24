# 🚀 Quick Start Guide - AI Personal Assistant

## 📋 TL;DR - What You Need

### On Linux Server (Backend)
```bash
./setup.sh quick
npm run dev
```

### On Windows 11 (Desktop Agent)
```powershell
setup-desktop.bat
cd desktop-agent
npm run dev
```

---

## 🎯 What This Thing Actually Does

Your AI Personal Assistant is a **proactive digital companion** that:

### ✅ Works Right Now
- **Chat via Web Dashboard** - Full conversations with memory and context
- **SMS Communication** - Text your assistant, get responses (needs Twilio)
- **Voice Commands** - Say "Computer, [command]" (needs setup)
- **Web Search** - Built-in using Claude's web search
- **Vision** - Can see and analyze your screen
- **Calendar & Reminders** - Schedule events, set reminders
- **Goal Tracking** - Break down goals into milestones automatically
- **Health Tracking** - Log sleep, workouts, mindfulness
- **Autonomous Agent** - Thinks about your life and suggests tasks proactively

### 🟡 Partially Works (UI exists, features incomplete)
- **Calendar View** - UI exists in dashboard, full features not wired up
- **Goals Dashboard** - Can create goals, but visualization incomplete
- **Health Dashboard** - Tracking works, but charts/trends not built yet

### ❌ Not Built Yet (but planned)
- **Desktop notifications** from autonomous agent
- **Voice alarms** via phone (Twilio voice calls)
- **Remote PC access** from your phone
- **ADHD body double mode** (active focus sessions)

---

## 🔧 Installation - Step by Step

### Part 1: Linux Backend

**Install on your Linux server (or WSL2 on Windows):**

```bash
# 1. Clone the repo
git clone <your-repo>
cd agent

# 2. Run quick setup
./setup.sh quick
# This will:
# - Check prerequisites
# - Install dependencies (backend + web dashboard)
# - Setup PostgreSQL database
# - Create .env file
# - Run migrations
# - Build everything

# 3. Add your API key to .env
nano .env
# Set: ANTHROPIC_API_KEY=sk-ant-...

# 4. Start the backend
npm run dev
# Runs on http://localhost:3000

# 5. Start the web dashboard (new terminal)
cd web
npm run dev
# Runs on http://localhost:5173
```

### Part 2: Windows 11 Desktop Agent

**On your Windows 11 PC:**

```powershell
# 1. Navigate to project directory
cd C:\Users\YourName\agent

# 2. Run Windows setup script
setup-desktop.bat
# This will:
# - Check for Node.js, Python, SOX
# - Install desktop-agent dependencies
# - Download Whisper model (~142MB)
# - Install Python TTS packages
# - Build the desktop agent

# 3. Install missing tools if needed
choco install sox.portable -y
choco install python -y

# 4. Download whisper-cpp binary
# From: https://github.com/ggerganov/whisper.cpp/releases
# Extract and add to PATH

# 5. Get Porcupine key
# Sign up at: https://console.picovoice.ai
# Copy your access key

# 6. Update .env (or create .env.local in desktop-agent/)
PORCUPINE_ACCESS_KEY=your-key-here
WHISPER_MODEL_PATH=./models/whisper/ggml-base.en.bin
PYTHON_PATH=python
VOICE_ENABLED=true

# 7. Start desktop agent
cd desktop-agent
npm run dev
```

---

## 🎮 How to Use It

### Web Dashboard (http://localhost:5173)

**Overview Page:**
- See today's schedule
- Active goals summary
- System status
- Recent insights from autonomous agent

**Chat:**
- Click "Chat" in sidebar
- Type messages naturally
- Try:
  - "What's on my calendar today?"
  - "Search for the latest AI news"
  - "Remind me to call mom at 3pm"
  - "Create a goal to learn Python"
  - "I slept 8 hours last night"

**Settings:**
- Add API keys (Anthropic, Twilio)
- Customize accent color
- Choose LLM model (Haiku/Sonnet/Opus or Auto)

**Billing:**
- Track API usage across all services
- See cost breakdowns by provider

### Voice Commands (Desktop Agent)

**Wake Word:** "Computer"

**Example Commands:**
```
"Computer, what's on my screen?"
"Computer, remind me to buy milk tomorrow"
"Computer, search for Qwen3-TTS documentation"
"Computer, what's on my calendar today?"
"Computer, log a workout - ran 3 miles"
"Computer, create a goal to learn TypeScript"
```

**System Tray Icon:**
- Right-click the tray icon (near clock)
- **Enable Voice** - Start listening for wake word
- **Disable Voice** - Stop listening
- **Settings** - Configure voice options
- **Quit** - Close the desktop agent

### SMS Commands

**Text your Twilio number:**
```
"remind me to call mom at 3pm"
"what's on my calendar?"
"I slept 8 hours"
"log workout - 30 min yoga"
"create goal learn Python by March"
```

### Autonomous Agent

**Runs automatically in the background:**
- Analyzes your schedule, goals, health patterns
- Generates insights and suggestions
- Auto-breaks down goals into milestones
- Sends SMS suggestions for high-priority items
- Self-schedules (sleeps 1-12 hours based on your activity)

**Check insights:**
- Web Dashboard → Overview → "Agent Insights" section
- Or check your SMS for proactive suggestions

---

## 🔑 Required Setup for Each Feature

### Minimum (Just Chat)
```env
DATABASE_URL=postgresql://localhost:5432/ai_assistant
REDIS_URL=redis://localhost:6379
ANTHROPIC_API_KEY=sk-ant-...
```
**Cost:** ~$5-20/month (Claude API usage only)

### + SMS Features
```env
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890
FEATURE_SMS_ENABLED=true
```
**Cost:** +$1/month (phone number) + $0.0079/SMS

### + Voice Features (100% Local!)
```env
WHISPER_MODEL_PATH=./models/whisper/ggml-base.en.bin
PYTHON_PATH=python3
PORCUPINE_ACCESS_KEY=...
VOICE_ENABLED=true
```
**Cost:** $0/month (fully offline!)

**Requires on Windows:**
- SOX (audio recording)
- whisper-cpp binary
- Python 3.10+ with packages: `torch torchaudio transformers TTS`
- Porcupine key (free for personal use)

---

## 🎨 What to Expect When Running

### Backend (Terminal 1)
```
✓ PostgreSQL connected
✓ Redis connected
✓ Server listening on :3000
✓ Socket.io server ready
✓ Autonomous agent started (next wake: 4 hours)
```

### Web Dashboard (Terminal 2)
```
  VITE v5.x ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Desktop Agent (Terminal 3 - Windows)
```
[Desktop Agent] Starting...
[Porcupine] Initialized (wake word: Computer)
[Audio] Listening for wake word...
[Socket.io] Connected to backend
[TTS] Qwen3-TTS model ready
```

**System Tray Icon:**
- Gray icon = Not listening
- Blue icon = Listening for wake word
- Green icon = Processing command

---

## 💡 What Works vs What Doesn't

### ✅ FULLY WORKING

| Feature | Status | How to Use |
|---------|--------|------------|
| **Chat** | ✅ | Web dashboard or SMS |
| **Memory** | ✅ | Automatic - remembers everything you tell it |
| **Web Search** | ✅ | "Search for [topic]" |
| **Vision** | ✅ | "What's on my screen?" (desktop agent) |
| **Reminders** | ✅ | "Remind me to [task] at [time]" |
| **Goals** | ✅ | "Create a goal to [objective]" - auto-generates milestones |
| **Health Logging** | ✅ | "I slept X hours", "Log workout - [activity]" |
| **Calendar** | ✅ | "Schedule [event] at [time]" |
| **Autonomous Agent** | ✅ | Runs automatically, check insights in dashboard |
| **Cost Tracking** | ✅ | Dashboard → Billing |

### 🟡 PARTIALLY WORKING (Backend done, UI incomplete)

| Feature | What Works | What Doesn't |
|---------|------------|--------------|
| **Calendar View** | Events stored, can query | No calendar grid UI yet |
| **Goals Dashboard** | Goal CRUD, milestones | No progress charts/visualizations |
| **Health Dashboard** | Data logging | No trend analysis or charts |
| **Privacy Toggles** | Backend permission system | No UI toggles in settings yet |

### ❌ NOT IMPLEMENTED YET

| Feature | Status | Notes |
|---------|--------|-------|
| **Desktop Notifications** | Planned | Agent insights currently SMS-only |
| **Voice Alarms** | Planned | Twilio voice call wake-ups |
| **Remote PC Access** | Planned | Control desktop from phone |
| **ADHD Body Double** | Planned | Active focus sessions |
| **PWA Mode** | Planned | Install dashboard as app |

---

## 🐛 Troubleshooting

### "Desktop agent won't start"
**Check:**
1. Backend is running (`npm run dev`)
2. PORCUPINE_ACCESS_KEY in `.env`
3. `cd desktop-agent && npm install`
4. Check console for errors

### "Wake word not detecting"
**Solutions:**
1. Check system tray icon - is voice enabled?
2. Speak clearly: "**Computer**" (pause) "[your command]"
3. Check microphone permissions (Windows Settings → Privacy)
4. Verify SOX is installed: `sox --version`

### "Voice command produces no audio response"
**Check:**
1. Python installed: `python --version`
2. TTS packages: `pip install torch torchaudio transformers TTS`
3. Test manually: `python scripts/qwen3_tts.py --help`
4. Check backend logs for errors

### "SMS not working"
**Check:**
1. `FEATURE_SMS_ENABLED=true` in `.env`
2. Twilio credentials are correct
3. Phone number verified in Twilio
4. Backend running and webhook accessible

### "Autonomous agent not generating insights"
**Check:**
1. ANTHROPIC_API_KEY is set
2. Backend logs: "Autonomous agent started"
3. Create some goals/calendar events (gives it context)
4. Wait for first thinking cycle (up to 4 hours default)

---

## 📊 Expected Performance

### Response Times
- **Chat (web):** 1-3 seconds
- **Voice command:** 3-5 seconds end-to-end
  - Wake word detection: instant
  - STT (Whisper): 1-2 seconds
  - Processing: 1-2 seconds
  - TTS (Qwen3): 1-2 seconds
- **SMS:** 2-5 seconds

### Resource Usage
- **Backend:** ~200-500 MB RAM
- **Desktop Agent:** ~150-300 MB RAM
- **Whisper STT:** ~500 MB RAM (during transcription)
- **Qwen3-TTS:** ~1 GB RAM (during synthesis)

### Storage
- **Whisper model:** 142 MB
- **Qwen3-TTS model:** ~200 MB (auto-downloads)
- **Database:** Grows over time (conversations, memories)
- **Screenshots:** Optional, configurable retention

---

## 🎯 Recommended First Steps

**Day 1: Get Chat Working**
1. Run backend + web dashboard
2. Create account
3. Add Anthropic API key
4. Chat with your assistant
5. Test: "remind me to check this in 5 minutes"

**Day 2: Add SMS**
1. Sign up for Twilio ($15 free credit)
2. Get a phone number
3. Add Twilio credentials to `.env`
4. Text your assistant!

**Day 3: Enable Voice**
1. Run `setup-desktop.bat` on Windows
2. Install missing components (SOX, whisper-cpp, Python)
3. Start desktop agent
4. Say "Computer, hello!"

**Day 4: Let it Learn**
1. Tell it about your goals
2. Log some health data
3. Add calendar events
4. Let autonomous agent analyze overnight
5. Check insights in the morning

---

## 💰 Cost Expectations

### With Minimal Features (Chat Only)
- Anthropic API: ~$5-15/month
- **Total: $5-15/month**

### With SMS
- Anthropic API: ~$10-20/month
- Twilio: $1/month + ~$5-10/month SMS
- **Total: ~$16-31/month**

### With Voice (Recommended!)
- Anthropic API: ~$10-20/month
- Twilio SMS: ~$6-11/month
- Voice (local): $0/month!
- **Total: ~$16-31/month**

**Savings:** Using local voice saves ~$22-99/month vs ElevenLabs!

---

## 🚀 You're Ready!

**Backend running?** ✅
**Web dashboard open?** ✅
**Desktop agent in tray?** ✅
**Said "Computer"?** ✅

You now have a fully functional AI personal assistant! 🎉

**Questions? Check:**
- `VOICE_SETUP.md` - Detailed voice setup
- `CLAUDE.md` - Project architecture
- `TODO.md` - Feature status and roadmap
- GitHub Issues - Report bugs or request features

**Have fun!** 🤖
