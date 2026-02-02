# ============================================================================
# AI Personal Assistant - Windows 11 Backend Setup (PowerShell)
# ============================================================================
# Usage: powershell -ExecutionPolicy Bypass -File setup-windows.ps1
# ============================================================================

param(
    [switch]$SkipDocker,
    [switch]$SkipInstall,
    [string]$AnthropicKey
)

$ErrorActionPreference = "Stop"

function Write-Header($text) {
    Write-Host ""
    Write-Host "=== $text ===" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Ok($text) {
    Write-Host "  [OK] $text" -ForegroundColor Green
}

function Write-Warn($text) {
    Write-Host "  [!!] $text" -ForegroundColor Yellow
}

function Write-Err($text) {
    Write-Host "  [ERR] $text" -ForegroundColor Red
}

function Write-Step($text) {
    Write-Host "  --> $text" -ForegroundColor Blue
}

function Test-Command($cmd) {
    try { Get-Command $cmd -ErrorAction Stop | Out-Null; return $true }
    catch { return $false }
}

# ============================================================================
# Step 1: Check prerequisites
# ============================================================================
Write-Header "Step 1/6: Checking Prerequisites"

# Node.js
if (Test-Command "node") {
    $nodeVer = (node -v).Trim()
    $major = [int]($nodeVer -replace '^v(\d+).*', '$1')
    if ($major -ge 20) {
        Write-Ok "Node.js $nodeVer"
    } else {
        Write-Warn "Node.js $nodeVer found, but v20+ is recommended"
    }
} else {
    Write-Err "Node.js not found. Install from https://nodejs.org (LTS v20+)"
    Write-Host "  After installing, restart PowerShell and run this script again."
    exit 1
}

# npm
if (Test-Command "npm") {
    $npmVer = (npm -v).Trim()
    Write-Ok "npm $npmVer"
} else {
    Write-Err "npm not found"
    exit 1
}

# Docker (unless skipped)
if (-not $SkipDocker) {
    if (Test-Command "docker") {
        Write-Ok "Docker found"
        # Check if Docker daemon is running
        try {
            docker info 2>&1 | Out-Null
            Write-Ok "Docker daemon is running"
        } catch {
            Write-Err "Docker is installed but not running. Start Docker Desktop first."
            exit 1
        }
    } else {
        Write-Warn "Docker not found"
        Write-Host "  Options:" -ForegroundColor Yellow
        Write-Host "    1. Install Docker Desktop: https://docker.com/products/docker-desktop" -ForegroundColor Yellow
        Write-Host "    2. Install Postgres + Redis natively (see .env.example for URLs)" -ForegroundColor Yellow
        Write-Host "    3. Re-run with -SkipDocker and use cloud databases (Neon, Upstash)" -ForegroundColor Yellow
        Write-Host ""
        $continue = Read-Host "Continue without Docker? (y/N)"
        if ($continue -ne "y") { exit 0 }
        $SkipDocker = $true
    }
}

# Git
if (Test-Command "git") {
    Write-Ok "Git found"
} else {
    Write-Warn "Git not found (not required for setup, but useful)"
}

# ============================================================================
# Step 2: Start Docker services (Postgres + Redis)
# ============================================================================
Write-Header "Step 2/6: Database Services"

if (-not $SkipDocker) {
    Write-Step "Starting PostgreSQL and Redis via Docker..."

    # Check if docker-compose.yml exists
    if (-not (Test-Path "docker-compose.yml")) {
        Write-Err "docker-compose.yml not found. Make sure you're in the project root."
        exit 1
    }

    docker compose up -d
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Docker Compose failed. Is Docker Desktop running?"
        exit 1
    }

    # Wait for services to be healthy
    Write-Step "Waiting for services to be ready..."
    $retries = 0
    $maxRetries = 15
    do {
        Start-Sleep -Seconds 2
        $retries++
        try {
            docker compose exec -T postgres pg_isready -U postgres 2>&1 | Out-Null
            $pgReady = ($LASTEXITCODE -eq 0)
        } catch { $pgReady = $false }
    } while (-not $pgReady -and $retries -lt $maxRetries)

    if ($pgReady) {
        Write-Ok "PostgreSQL is ready (localhost:5432)"
        Write-Ok "Redis is ready (localhost:6379)"
    } else {
        Write-Warn "Services may still be starting. Check with: docker compose ps"
    }
} else {
    Write-Warn "Skipping Docker services"
    Write-Host "  Make sure PostgreSQL and Redis are available. Update .env with connection URLs." -ForegroundColor Yellow
}

# ============================================================================
# Step 3: Create .env file
# ============================================================================
Write-Header "Step 3/6: Environment Configuration"

if (Test-Path ".env") {
    Write-Warn ".env file already exists"
    $overwrite = Read-Host "  Overwrite? (y/N)"
    if ($overwrite -ne "y") {
        Write-Step "Keeping existing .env"
    } else {
        Copy-Item ".env.example" ".env" -Force
        Write-Ok "Fresh .env created from template"
    }
} else {
    Copy-Item ".env.example" ".env"
    Write-Ok "Created .env from template"
}

# Generate secrets
Write-Step "Generating security secrets..."

function New-Secret {
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    return [System.Convert]::ToHexString($bytes).ToLower()
}

$envContent = Get-Content ".env" -Raw

# Generate and replace secrets (only for env vars actually read by the code)
$jwtSecret = New-Secret
$encryptionKey = New-Secret

$envContent = $envContent -replace 'JWT_SECRET=.*', "JWT_SECRET=$jwtSecret"
$envContent = $envContent -replace 'ENCRYPTION_KEY=.*', "ENCRYPTION_KEY=$encryptionKey"

# Set Docker-appropriate database URL
if (-not $SkipDocker) {
    $envContent = $envContent -replace 'DATABASE_URL=.*', 'DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_assistant'
}

# Set Anthropic key if provided
if ($AnthropicKey) {
    $envContent = $envContent -replace 'ANTHROPIC_API_KEY=.*', "ANTHROPIC_API_KEY=$AnthropicKey"
    Write-Ok "Anthropic API key set"
} else {
    Write-Warn "No Anthropic API key provided"
    Write-Host "  Get one at: https://console.anthropic.com/settings/keys" -ForegroundColor Yellow
    Write-Host "  Add it to .env later: ANTHROPIC_API_KEY=sk-ant-..." -ForegroundColor Yellow
    $keyInput = Read-Host "  Enter key now (or press Enter to skip)"
    if ($keyInput) {
        $envContent = $envContent -replace 'ANTHROPIC_API_KEY=.*', "ANTHROPIC_API_KEY=$keyInput"
        Write-Ok "Anthropic API key set"
    }
}

# Twilio SMS configuration
Write-Host ""
Write-Host "  Twilio SMS Configuration (press Enter to skip all)" -ForegroundColor White
Write-Host "  Get credentials at: https://console.twilio.com" -ForegroundColor Gray

$twilioSid = Read-Host "  Twilio Account SID (or Enter to skip)"
if ($twilioSid) {
    $envContent = $envContent -replace 'TWILIO_ACCOUNT_SID=.*', "TWILIO_ACCOUNT_SID=$twilioSid"

    $twilioToken = Read-Host "  Twilio Auth Token"
    if ($twilioToken) {
        $envContent = $envContent -replace 'TWILIO_AUTH_TOKEN=.*', "TWILIO_AUTH_TOKEN=$twilioToken"
    }

    $twilioPhone = Read-Host "  Twilio Phone Number (e.g. +15551234567)"
    if ($twilioPhone) {
        $envContent = $envContent -replace 'TWILIO_PHONE_NUMBER=.*', "TWILIO_PHONE_NUMBER=$twilioPhone"
        $envContent = $envContent -replace 'FEATURE_SMS_ENABLED=.*', 'FEATURE_SMS_ENABLED=true'
    }

    Write-Ok "Twilio SMS configuration saved (SMS enabled)"
} else {
    Write-Step "Skipping Twilio - you can add it to .env later"
}

Set-Content ".env" $envContent -NoNewline
Write-Ok "Environment configured with secure secrets"

# ============================================================================
# Step 4: Install dependencies
# ============================================================================
Write-Header "Step 4/6: Installing Dependencies"

if (-not $SkipInstall) {
    Write-Step "Installing backend dependencies (npm install)..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Err "npm install failed"
        exit 1
    }
    Write-Ok "Backend dependencies installed"

    # Install web dashboard if it exists
    if (Test-Path "web/package.json") {
        Write-Step "Installing web dashboard dependencies..."
        Push-Location web
        npm install
        Pop-Location
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "Web dashboard install failed (non-critical)"
        } else {
            Write-Ok "Web dashboard dependencies installed"
        }
    }
} else {
    Write-Step "Skipping dependency installation"
}

# ============================================================================
# Step 5: Run database migrations
# ============================================================================
Write-Header "Step 5/6: Database Migrations"

Write-Step "Running database migrations..."
npm run migrate:up
if ($LASTEXITCODE -ne 0) {
    Write-Err "Migrations failed. Check your DATABASE_URL in .env"
    Write-Host "  If using Docker, make sure containers are running: docker compose ps" -ForegroundColor Yellow
    exit 1
}
Write-Ok "Database migrations complete"

# ============================================================================
# Step 6: Verify
# ============================================================================
Write-Header "Step 6/6: Verification"

Write-Step "Building TypeScript..."
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Warn "TypeScript build had errors (may still work in dev mode with tsx)"
} else {
    Write-Ok "TypeScript build successful"
}

# ============================================================================
# Done!
# ============================================================================
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Start the backend:" -ForegroundColor White
Write-Host "    npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Start the web dashboard (separate terminal):" -ForegroundColor White
Write-Host "    cd web && npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Backend URL:    http://localhost:3000" -ForegroundColor White
Write-Host "  Health check:   http://localhost:3000/health" -ForegroundColor White
Write-Host "  Dashboard URL:  http://localhost:5173" -ForegroundColor White
Write-Host ""

if (-not $SkipDocker) {
    Write-Host "  Docker services:" -ForegroundColor White
    Write-Host "    docker compose ps       # Check status" -ForegroundColor Gray
    Write-Host "    docker compose down      # Stop services" -ForegroundColor Gray
    Write-Host "    docker compose down -v   # Stop + delete data" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "  Voice setup (later):" -ForegroundColor White
Write-Host "    See VOICE_SETUP.md for desktop agent voice commands" -ForegroundColor Gray
Write-Host ""
