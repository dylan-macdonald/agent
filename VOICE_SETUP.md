# Voice Assistant Setup Guide

## 🎙️ 100% Local Voice - No API Costs!

The AI Personal Assistant uses **fully offline** voice recognition and synthesis:
- **Whisper.cpp** for Speech-to-Text (STT)
- **Piper TTS** for Text-to-Speech (TTS)
- **Porcupine** for Wake Word Detection

This means **zero ongoing costs** for voice features!

---

## Windows 11 Setup (Desktop Agent)

### 1. Install Prerequisites

#### A. Install Chocolatey (Windows Package Manager)
Open PowerShell as Administrator:
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

#### B. Install SOX (Audio Recording)
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

**Or Build from Source (Recommended for best performance):**
```powershell
# Install Visual Studio Build Tools (if not already installed)
choco install visualstudio2022buildtools -y

# Clone and build
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp
mkdir build
cd build
cmake ..
cmake --build . --config Release

# Copy main.exe to PATH
copy Release\main.exe "C:\Program Files\whisper-cpp\whisper-cpp.exe"
```

#### B. Piper TTS (Text-to-Speech)

**Download Pre-built Binary:**
1. Go to: https://github.com/rhasspy/piper/releases
2. Download `piper_windows_amd64.zip`
3. Extract to `C:\Program Files\piper\`
4. Add to PATH (same as above)

Verify installation:
```powershell
whisper-cpp --help
piper --help
```

### 3. Download Voice Models

#### A. Whisper Model (STT)

Create models directory in your project:
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

**Alternative: Tiny (75 MB) - Fastest, less accurate**
```powershell
curl -L "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin" -o models\whisper\ggml-tiny.en.bin
```

#### B. Piper Voice Model (TTS)

```powershell
mkdir models\piper
```

Download a voice (choose one):

**Recommended: Lessac Medium (US English, Natural)**
```powershell
# Download model
curl -L "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx" -o models\piper\en_US-lessac-medium.onnx

# Download config
curl -L "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json" -o models\piper\en_US-lessac-medium.onnx.json
```

**Alternative Voices:**
- **Amy (Low quality, fast)**: `en_US/amy/low/en_US-amy-low.onnx`
- **Libritts High (Higher quality, slower)**: `en_US/libritts/high/en_US-libritts-high.onnx`

Browse all voices: https://huggingface.co/rhasspy/piper-voices/tree/main

### 4. Configure Environment

Edit `.env`:
```env
# Voice Models
WHISPER_MODEL_PATH=./models/whisper/ggml-base.en.bin
PIPER_MODEL_PATH=./models/piper/en_US-lessac-medium.onnx

# Binaries (if not in PATH)
WHISPER_BINARY_PATH=whisper-cpp
PIPER_BINARY_PATH=piper

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

Start the backend:
```powershell
npm run dev
```

Start the desktop agent (in a new terminal):
```powershell
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
sudo apt-get install -y sox libsox-fmt-all build-essential cmake git

# Fedora/RHEL
sudo dnf install -y sox cmake gcc-c++ git

# Arch
sudo pacman -S sox cmake gcc git
```

### 2. Install Whisper.cpp

```bash
cd ~
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp
make
sudo cp main /usr/local/bin/whisper-cpp
```

### 3. Install Piper TTS

```bash
cd ~
wget https://github.com/rhasspy/piper/releases/latest/download/piper_linux_x86_64.tar.gz
tar -xzf piper_linux_x86_64.tar.gz
sudo cp piper/piper /usr/local/bin/
```

### 4. Download Models

```bash
cd ~/agent

# Create directories
mkdir -p models/whisper models/piper

# Download Whisper model
curl -L "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin" \
  -o models/whisper/ggml-base.en.bin

# Download Piper voice
curl -L "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx" \
  -o models/piper/en_US-lessac-medium.onnx

curl -L "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json" \
  -o models/piper/en_US-lessac-medium.onnx.json
```

### 5. Configure and Test

Same as Windows steps 4-6 above.

---

## Troubleshooting

### "whisper-cpp: command not found"

- Make sure the binary is in your PATH
- Or set `WHISPER_BINARY_PATH` in `.env` to the full path

### "piper: command not found"

- Same as above for Piper
- Set `PIPER_BINARY_PATH` in `.env`

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

### Model download fails

- Try manual download from links above
- Place in correct directory structure

---

## Model Size Comparison

### Whisper Models

| Model | Size | Speed | Accuracy | Recommended For |
|-------|------|-------|----------|-----------------|
| tiny.en | 75 MB | Very Fast | Basic | Testing only |
| base.en | 142 MB | Fast | Good | **Default** |
| small.en | 466 MB | Medium | Better | High accuracy needs |
| medium.en | 1.5 GB | Slow | Best | Offline use |

### Piper Voices

| Voice | Size | Quality | Speed |
|-------|------|---------|-------|
| amy-low | ~10 MB | Low | Very Fast |
| lessac-medium | ~63 MB | High | **Fast** |
| libritts-high | ~100 MB | Very High | Medium |

---

## Cost Comparison

**With Local Models:**
- Initial download: ~200 MB
- Ongoing cost: **$0/month**
- Processing: Local CPU/GPU

**With Cloud APIs (OpenAI + ElevenLabs):**
- Initial setup: $0
- Ongoing cost: **~$20-50/month** (moderate use)
- Processing: Cloud API calls

**You save ~$240-600/year by going local!** 🎉
