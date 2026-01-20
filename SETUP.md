# Setup & Installation Guide

## Prerequisites

- Node.js (v18+)
- PostgreSQL (v14+)
- Redis (v6+)

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

### Required Keys

| Variable | Description | Required For |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | Core / DB |
| `REDIS_URL` | Redis connection string | Caching / Queues |
| `OPENAI_API_KEY` | OpenAI API Key | Voice (Whisper) / LLM |
| `ELEVENLABS_API_KEY` | ElevenLabs API Key | Voice (TTS) |
| `EXA_API_KEY` | Exa.ai API Key | Web Search Tool |
| `PICOVOICE_ACCESS_KEY` | Picovoice Access Key | Wake Word (Desktop) |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | SMS |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | SMS |
| `TWILIO_PHONE_NUMBER` | Twilio Phone Number | SMS |
| `ASSISTANT_BACKEND_URL` | URL of the backend server | Desktop Agent |
| `ASSISTANT_USER_ID` | User ID for the desktop agent | Desktop Agent |

## Installation

```bash
npm install
```

## Database Setup

1. **Install PostgreSQL and Redis**:
   - Limit setup varies by OS (e.g., `brew install postgresql redis` on macOS, `sudo apt-get install postgresql redis` on Linux).

2. **Start Services**:
   ```bash
   # Linux/macOS
   sudo service postgresql start
   sudo service redis-server start
   ```

3. **Create Database & User**:
   Access the Postgres CLI:
   ```bash
   sudo -u postgres psql
   ```
   Run the following SQL commands:
   ```sql
   CREATE DATABASE ai_assistant;
   CREATE USER postgres WITH ENCRYPTED PASSWORD 'password';
   GRANT ALL PRIVILEGES ON DATABASE ai_assistant TO postgres;
   \c ai_assistant
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```

4. **Verify Environment Variables**:
   Ensure your `.env` file matches the credentials created above:
   ```
   DATABASE_URL=postgresql://postgres:password@localhost:5432/ai_assistant
   REDIS_URL=redis://localhost:6379
   ```

5. **Run Migrations**:
   Now run the migrations to create the table structure:
   ```bash
   npm run migrate:up
   ```

## Running the Application

### Backend Server

```bash
npm run dev
```

### Desktop Agent

Navigate to `desktop-agent/` and run:

```bash
cd desktop-agent
npm install
npm run build
npm start
```

## Verification

To verify the tools implementation:

```bash
npm run build
node dist/scripts/verify-tools.js
```
