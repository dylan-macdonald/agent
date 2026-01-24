@echo off
REM ============================================================================
REM AI Personal Assistant - Desktop Agent Setup for Windows 11
REM ============================================================================

setlocal EnableDelayedExpansion

REM Colors
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "CYAN=[96m"
set "NC=[0m"

echo.
echo %CYAN%=========================================================================%NC%
echo %CYAN%    AI Personal Assistant - Desktop Agent Setup (Windows 11)%NC%
echo %CYAN%=========================================================================%NC%
echo.

REM ============================================================================
REM STEP 1: Check Prerequisites
REM ============================================================================

echo %BLUE%[1/7] Checking Prerequisites...%NC%
echo.

REM Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%ERROR: Node.js not found!%NC%
    echo Please install Node.js 20+ from https://nodejs.org
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
    echo %GREEN%✓ Node.js !NODE_VERSION!%NC%
)

REM Check npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%ERROR: npm not found!%NC%
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
    echo %GREEN%✓ npm !NPM_VERSION!%NC%
)

REM Check Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo %YELLOW%WARNING: Python not found!%NC%
    echo Python is required for Qwen3-TTS (voice synthesis)
    echo Download from: https://www.python.org/downloads/
    set PYTHON_FOUND=0
) else (
    for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
    echo %GREEN%✓ !PYTHON_VERSION!%NC%
    set PYTHON_FOUND=1
)

REM Check SOX
where sox >nul 2>&1
if %errorlevel% neq 0 (
    echo %YELLOW%WARNING: SOX not found!%NC%
    echo SOX is required for audio recording (microphone input)
    echo Install with: choco install sox.portable -y
    echo Or download from: https://sourceforge.net/projects/sox/
    set SOX_FOUND=0
) else (
    for /f "tokens=*" %%i in ('sox --version 2^>^&1 ^| findstr /C:"sox"') do set SOX_VERSION=%%i
    echo %GREEN%✓ !SOX_VERSION!%NC%
    set SOX_FOUND=1
)

echo.
echo %BLUE%[2/7] Installing Desktop Agent Dependencies...%NC%
echo.

REM Navigate to desktop-agent directory
cd desktop-agent
if %errorlevel% neq 0 (
    echo %RED%ERROR: desktop-agent directory not found!%NC%
    echo Make sure you're running this from the project root.
    pause
    exit /b 1
)

REM Install npm dependencies
echo Installing npm packages...
call npm install
if %errorlevel% neq 0 (
    echo %RED%ERROR: npm install failed!%NC%
    pause
    exit /b 1
)
echo %GREEN%✓ Desktop agent dependencies installed%NC%

cd ..

echo.
echo %BLUE%[3/7] Installing Python Dependencies (for TTS)...%NC%
echo.

if %PYTHON_FOUND%==1 (
    echo Installing Python packages: torch, torchaudio, transformers, TTS...
    python -m pip install --upgrade pip
    python -m pip install torch torchaudio transformers TTS
    if %errorlevel% neq 0 (
        echo %YELLOW%WARNING: Python package installation failed!%NC%
        echo Voice TTS may not work. Check your Python installation.
    ) else (
        echo %GREEN%✓ Python TTS dependencies installed%NC%
    )
) else (
    echo %YELLOW%SKIPPED: Python not found%NC%
    echo Install Python 3.10+ to enable voice synthesis
)

echo.
echo %BLUE%[4/7] Downloading Whisper STT Model...%NC%
echo.

REM Create models directory
if not exist "models\whisper" mkdir models\whisper

REM Check if model already exists
if exist "models\whisper\ggml-base.en.bin" (
    echo %GREEN%✓ Whisper model already downloaded%NC%
) else (
    echo Downloading Whisper base model (142 MB)...
    echo This may take a few minutes...
    curl -L "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin" -o models\whisper\ggml-base.en.bin
    if %errorlevel% neq 0 (
        echo %RED%ERROR: Failed to download Whisper model%NC%
        echo You can download manually from:
        echo https://huggingface.co/ggerganov/whisper.cpp/tree/main
        pause
    ) else (
        echo %GREEN%✓ Whisper model downloaded%NC%
    )
)

echo.
echo %BLUE%[5/7] Checking for whisper-cpp binary...%NC%
echo.

where whisper-cpp >nul 2>&1
if %errorlevel% neq 0 (
    where whisper >nul 2>&1
    if %errorlevel% neq 0 (
        echo %YELLOW%WARNING: whisper-cpp binary not found!%NC%
        echo.
        echo Download whisper-cpp from:
        echo https://github.com/ggerganov/whisper.cpp/releases
        echo.
        echo Extract and add to PATH, or set WHISPER_BINARY_PATH in .env
        set WHISPER_FOUND=0
    ) else (
        echo %GREEN%✓ whisper binary found%NC%
        set WHISPER_FOUND=1
    )
) else (
    echo %GREEN%✓ whisper-cpp binary found%NC%
    set WHISPER_FOUND=1
)

echo.
echo %BLUE%[6/7] Testing Qwen3-TTS...%NC%
echo.

if %PYTHON_FOUND%==1 (
    echo Testing TTS setup...
    echo Hello, I am your AI assistant. > test_tts.txt
    python scripts\qwen3_tts.py --text-file test_tts.txt --output test_tts.wav 2>nul
    if %errorlevel% equ 0 (
        echo %GREEN%✓ Qwen3-TTS working! Model auto-downloaded.%NC%
        del test_tts.txt test_tts.wav 2>nul
    ) else (
        echo %YELLOW%TTS test failed - will try again when you run the app%NC%
    )
) else (
    echo %YELLOW%SKIPPED: Python not found%NC%
)

echo.
echo %BLUE%[7/7] Building Desktop Agent...%NC%
echo.

cd desktop-agent
call npm run build
if %errorlevel% neq 0 (
    echo %YELLOW%WARNING: Build failed - you'll need to fix TypeScript errors%NC%
) else (
    echo %GREEN%✓ Desktop agent built successfully%NC%
)
cd ..

echo.
echo %CYAN%=========================================================================%NC%
echo %CYAN%                            SETUP COMPLETE!%NC%
echo %CYAN%=========================================================================%NC%
echo.

REM Check what's missing
set MISSING=0

if %SOX_FOUND%==0 (
    set MISSING=1
    echo %YELLOW%! MISSING: SOX (audio recording)%NC%
    echo   Install: choco install sox.portable -y
    echo.
)

if %WHISPER_FOUND%==0 (
    set MISSING=1
    echo %YELLOW%! MISSING: whisper-cpp binary (speech recognition)%NC%
    echo   Download: https://github.com/ggerganov/whisper.cpp/releases
    echo.
)

if %PYTHON_FOUND%==0 (
    set MISSING=1
    echo %YELLOW%! MISSING: Python 3.10+ (voice synthesis)%NC%
    echo   Download: https://www.python.org/downloads/
    echo.
)

if %MISSING%==1 (
    echo %YELLOW%Some components are missing. Voice features may not work.%NC%
    echo See VOICE_SETUP.md for detailed installation instructions.
    echo.
)

echo %GREEN%Next Steps:%NC%
echo.
echo 1. Make sure backend is running on your Linux server
echo    (npm run dev in the main project directory)
echo.
echo 2. Update .env with:
echo    - PORCUPINE_ACCESS_KEY (get from console.picovoice.ai)
echo    - WHISPER_MODEL_PATH=./models/whisper/ggml-base.en.bin
echo    - VOICE_ENABLED=true
echo.
echo 3. Start the desktop agent:
echo    cd desktop-agent
echo    npm run dev
echo.
echo 4. Look for the system tray icon (near your clock)
echo.
echo 5. Say "Computer" followed by your command!
echo.

pause
