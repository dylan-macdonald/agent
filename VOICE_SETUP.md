# Voice Assistant Setup Guide

## 🎙️ 100% Local Voice - No API Costs!

The AI Personal Assistant uses **fully offline** voice recognition and synthesis:
- **Whisper.cpp** for Speech-to-Text (STT)
- **Qwen3-TTS** for Text-to-Speech (TTS) - Brand new, state-of-the-art!
- **Porcupine** for Wake Word Detection

This means **zero ongoing costs** for voice features!

---

## Windows 11 Setup (Desktop Agent)

### 1. Install Prerequisites

#### A. Install Python 3.10+
```powershell
# Download and install from python.org
# Or use Chocolatey:
choco install python -y

# Verify installation
python --version  # Should be 3.10 or higher
```

#### B. Install Chocolatey (if not already)
Open PowerShell as Administrator:
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

#### C. Install SOX (Audio Recording)
```powershell
choco install sox.portable -y
```

Verify installation:
```powershell
sox --version
```

### 2. Install Voice Binaries

#### A. Whisper.cpp (Speech-to-Text)

**Download Pre-built Binary:**
1. Go to: https://github.com/ggerganov/whisper.cpp/releases
2. Download `whisper-bin-x64.zip` (Windows x64)
3. Extract to `C:\Program Files\whisper-cpp\`
4. Add to PATH:
   - Open System Properties → Environment Variables
   - Edit "Path" under System Variables
   - Add `C:\Program Files\whisper-cpp`

**Or Build from Source:**
```powershell
# Install Visual Studio Build Tools
choco install visualstudio2022buildtools -y

# Clone and build
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp
mkdir build
cd build
cmake ..
cmake --build . --config Release

# Copy to PATH
copy Release\main.exe "C:\Program Files\whisper-cpp\whisper-cpp.exe"
```

#### B. Qwen3-TTS (Text-to-Speech) - Python-based

**Install Python Dependencies:**
```powershell
# Navigate to your project
cd C:\Users\YourName\agent

# Install Qwen3-TTS dependencies
pip install torch torchaudio transformers

# Install fallback TTS (Coqui TTS) - faster, works while Qwen3-TTS API stabilizes
pip install TTS
```

**Note**: Qwen3-TTS is very new (just released). The Python script will:
1. Try to use Qwen3-TTS if available
2. Fall back to high-quality Coqui TTS if Qwen3-TTS isn't ready yet
3. Both are 100% offline and free!

Verify installation:
```powershell
python scripts/qwen3_tts.py --help
```

### 3. Download Voice Models

#### A. Whisper Model (STT)

Create models directory:
```powershell
cd C:\Users\YourName\agent
mkdir models\whisper
```

Download a model (choose one):

**Recommended: Base (142 MB) - Good balance**
```powershell
curl -L "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin" -o models\whisper\ggml-base.en.bin
```

**Alternative: Small (466 MB) - Better accuracy**
```powershell
curl -L "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin" -o models\whisper\ggml-small.en.bin
```

**Alternative: Tiny (75 MB) - Fastest**
```powershell
curl -L "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin" -o models\whisper\ggml-tiny.en.bin
```

#### B. Qwen3-TTS Model (Auto-downloads)

Qwen3-TTS will automatically download the model from HuggingFace on first use!

**Optional: Pre-download the model:**
```powershell
# Test the TTS system (will download ~200MB model on first run)
echo "Hello, this is a test." > test.txt
python scripts\qwen3_tts.py --text-file test.txt --output test.wav

# Model will be cached in ~/.cache/huggingface/
```

### 4. Configure Environment

Edit `.env`:
```env
# Voice Models
WHISPER_MODEL_PATH=./models/whisper/ggml-base.en.bin

# Python path (if not in PATH)
PYTHON_PATH=python3

# Optional: Specify Qwen3-TTS model path (auto-downloads if not set)
# QWEN3_MODEL_PATH=./models/qwen3-tts

# Wake Word Detection
PORCUPINE_ACCESS_KEY=your-key-from-picovoice.ai

# Enable Voice
VOICE_ENABLED=true
```

### 5. Get Porcupine Access Key

1. Go to: https://console.picovoice.ai/signup
2. Sign up (free for personal use)
3. Copy your Access Key from the dashboard
4. Paste it into `.env` as `PORCUPINE_ACCESS_KEY`

### 6. Test Voice Setup

**Test TTS Separately:**
```powershell
echo "Hello, I am your AI assistant." > test.txt
python scripts\qwen3_tts.py --text-file test.txt --output test.wav
# Play test.wav to hear the voice!
```

**Start the Full System:**
```powershell
# Backend
npm run dev

# Desktop agent (new terminal)
cd desktop-agent
npm run dev
```

Say **"Computer"** and then your command!

---

## Linux Setup (Backend Only)

### 1. Install Prerequisites

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y sox libsox-fmt-all build-essential cmake git python3 python3-pip

# Fedora/RHEL
sudo dnf install -y sox cmake gcc-c++ git python3 python3-pip

# Arch
sudo pacman -S sox cmake gcc git python python-pip
```

### 2. Install Whisper.cpp

```bash
cd ~
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp
make
sudo cp main /usr/local/bin/whisper-cpp
```

### 3. Install Qwen3-TTS Dependencies

```bash
# Install Python packages
pip3 install torch torchaudio transformers TTS

# Verify
python3 ~/agent/scripts/qwen3_tts.py --help
```

### 4. Download Models

```bash
cd ~/agent

# Create directories
mkdir -p models/whisper

# Download Whisper model
curl -L "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin" \
  -o models/whisper/ggml-base.en.bin

# Qwen3-TTS will auto-download on first use
```

### 5. Configure and Test

Same as Windows steps 4-6 above.

---

## Troubleshooting

### "whisper-cpp: command not found"

- Make sure the binary is in your PATH
- Or set `WHISPER_BINARY_PATH` in `.env` to the full path

### "Python script fails"

- Check Python version: `python3 --version` (needs 3.10+)
- Install dependencies: `pip install torch torchaudio transformers TTS`
- Check script permissions: `chmod +x scripts/qwen3_tts.py`

### "ModuleNotFoundError: No module named 'torch'"

```bash
pip install torch torchaudio transformers TTS
```

### SOX errors on Windows

- Reinstall SOX: `choco install sox.portable -y`
- Check PATH includes SOX directory

### Audio not recording

**Windows:**
- Check microphone permissions in Windows Settings → Privacy → Microphone
- Allow desktop app to access microphone

**Linux:**
- Test with: `sox -d test.wav`
- Install ALSA: `sudo apt-get install alsa-utils`

### Wake word not detecting

- Speak clearly and loudly
- Say "Computer" with a slight pause before your command
- Adjust sensitivity in desktop-agent code (manager.ts line 30)

### Qwen3-TTS falls back to Coqui TTS

This is expected! Qwen3-TTS is brand new. The fallback TTS (Coqui) is also excellent:
- High quality, natural voices
- Very fast generation
- 100% offline and free
- As Qwen3-TTS stabilizes, the script will automatically use it

---

## Model Size Comparison

### Whisper Models

| Model | Size | Speed | Accuracy | Recommended For |
|-------|------|-------|----------|-----------------|
| tiny.en | 75 MB | Very Fast | Basic | Testing only |
| base.en | 142 MB | Fast | Good | **Default** |
| small.en | 466 MB | Medium | Better | High accuracy needs |
| medium.en | 1.5 GB | Slow | Best | Offline use |

### TTS Models

| Model | Size | Quality | Speed | Status |
|-------|------|---------|-------|--------|
| Qwen3-TTS | ~200 MB | State-of-art | Fast | **New!** |
| Coqui TTS (fallback) | ~100 MB | Excellent | Very Fast | **Stable** |

---

## Voice Customization

### Speed Control

Edit `.env`:
```env
# Adjust TTS speed (0.5 = slow, 2.0 = fast)
QWEN3_SPEED=1.0
```

Or modify `src/app.ts`:
```typescript
const ttsProvider = new Qwen3TtsProvider({
  speed: 1.2,  // 20% faster
  temperature: 0.7
});
```

### Voice Variety

```typescript
const ttsProvider = new Qwen3TtsProvider({
  temperature: 0.9  // More expressive (0.1-1.0)
});
```

---

## Cost Comparison

**With Local Models:**
- Initial download: ~350 MB (Whisper + TTS)
- Ongoing cost: **$0/month**
- Processing: Local CPU/GPU
- Privacy: 100% offline

**With Cloud APIs (OpenAI + ElevenLabs):**
- Initial setup: $0
- Ongoing cost: **~$22-99/month** (moderate use)
- Processing: Cloud API calls
- Privacy: Audio sent to third parties

**You save ~$264-1,188/year by going local!** 🎉

---

## About Qwen3-TTS

Qwen3-TTS is developed by Alibaba's Qwen team and was just released in January 2025. It represents the state-of-the-art in open-source TTS:

- **Quality**: Natural, expressive voices
- **Speed**: Fast generation even on CPU
- **Multilingual**: Supports many languages
- **Free**: Fully open-source and offline

Learn more: https://huggingface.co/spaces/Qwen/Qwen3-TTS

The setup script includes Coqui TTS as a fallback while the official Qwen3-TTS Python package stabilizes. Both are excellent choices!
