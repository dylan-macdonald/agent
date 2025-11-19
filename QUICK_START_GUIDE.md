# Quick Start Guide - Autonomous Personal Assistant

This guide walks you through building the autonomous personal assistant using Claude Code and the provided specification.

---

## 📋 Prerequisites

### Required Accounts & API Keys

1. **Anthropic API** (for Claude models)
   - Sign up at console.anthropic.com
   - Create API key
   - Models used: Claude Haiku 4, Claude Sonnet 4.5

2. **OpenAI API** (for embeddings and judge)
   - Sign up at platform.openai.com
   - Create API key
   - Models used: GPT-4o-mini, text-embedding-3-small

3. **Twilio** (for SMS)
   - Sign up at twilio.com
   - Get phone number
   - Copy Account SID and Auth Token

4. **Discord** (for Discord bot)
   - Create application at discord.com/developers
   - Create bot and get token
   - Add bot to your server

5. **S3-Compatible Storage** (for backups)
   - Backblaze B2 (cheapest: $0.005/GB/month)
   - OR AWS S3
   - Get endpoint, access key, secret key

### Required Software

- **Docker Desktop** - For PostgreSQL and Redis
- **Python 3.11+** - Check with `python --version`
- **uv** - Install with `curl -LsSf https://astral.sh/uv/install.sh | sh`
- **Claude Code** - Install from docs.claude.com/en/docs/claude-code
- **Git** - For version control and Obsidian sync

---

## 🚀 Step-by-Step Setup

### Step 1: Create Project Directory

```bash
# Create project folder
mkdir autonomous-assistant
cd autonomous-assistant

# Initialize git
git init

# Create Claude Code config folder
mkdir .claude
```

### Step 2: Set Up Configuration

```bash
# Copy the CLAUDE.md file into .claude/
cp /path/to/CLAUDE.md .claude/CLAUDE.md

# Copy .env.example to .env
cp .env.example .env

# Edit .env with your API keys
nano .env  # or use your preferred editor
```

**Fill in these critical variables in .env:**
```bash
# API Keys
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-key-here

# Database
POSTGRES_PASSWORD=choose-secure-password

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxx
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
USER_PHONE_NUMBER=+1xxxxxxxxxx

# Discord
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_USER_ID=your-user-id

# S3 (Backblaze B2 example)
S3_ENDPOINT=https://s3.us-west-000.backblazeb2.com
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=assistant-backups
```

### Step 3: Start Claude Code

```bash
# Start Claude Code in your project directory
claude-code
```

### Step 4: Give Claude Code Initial Instructions

In Claude Code, paste:

```
I want you to build an autonomous personal assistant agent system.

The complete specification is in AGENT_BUILD_SPEC.md. Please read it carefully.

Key principles:
1. Build phase by phase (Infrastructure → Memory → Agents → Communication → Monitoring → Backups)
2. Test after each module before moving on
3. Use modular design with clear separation of concerns
4. Follow the exact build order in the spec

Let's start with Phase 1: Infrastructure.

Create a Docker Compose setup with:
- PostgreSQL 15+ with pgvector extension
- Redis 7+ for caching
- Proper health checks
- Volume mounts for data persistence

Ready to begin?
```

---

## 📝 Build Phase Instructions

### Phase 1: Infrastructure (2-3 hours)

**What Claude Code Should Build:**
- docker-compose.yml with PostgreSQL + Redis
- Database migrations (001_initial_schema.sql)
- Connection pooling setup
- Basic config loading

**Test It:**
```bash
# Start databases
docker-compose up -d postgres redis

# Check they're running
docker-compose ps

# Test connection
docker exec -it autonomous-assistant-postgres-1 psql -U assistant -d assistant -c "SELECT 1;"
```

**Tell Claude Code:**
```
Great! Now let's test the infrastructure.

Start the databases and verify:
1. PostgreSQL is running with pgvector extension
2. Redis is accessible
3. Create a simple connection test script

Once tests pass, we'll move to Phase 2.
```

### Phase 2: Memory Foundation (3-4 hours)

**What Claude Code Should Build:**
- src/memory/schemas.py (Pydantic models)
- src/memory/store.py (PostgreSQL wrapper)
- src/memory/cache.py (Redis wrapper)
- src/memory/embeddings.py (with caching)
- src/memory/retrieval.py (two-stage with re-ranking)
- src/memory/deduplicator.py
- Unit tests for all modules

**Test It:**
```bash
# Run memory tests
uv run pytest tests/unit/test_memory_store.py -v
uv run pytest tests/unit/test_cache.py -v
uv run pytest tests/unit/test_deduplication.py -v
```

**Tell Claude Code:**
```
Phase 1 looks good! Let's build the memory system.

Create:
1. Memory schemas with importance, decay, deduplication fields
2. PostgreSQL store with pgvector operations
3. Redis caching layer
4. Embedding generation with cache
5. Enhanced retrieval (vector search → re-rank)
6. Deduplication logic

Include comprehensive tests for each module.
```

### Phase 3: Router & Agents (3-4 hours)

**What Claude Code Should Build:**
- src/agents/router.py
- src/agents/haiku.py
- src/agents/sonnet.py
- src/agents/judge.py
- src/agents/tool_executor.py
- Integration tests for routing flow

**Test It:**
```bash
# Test router
uv run pytest tests/unit/test_router.py -v

# Test agents
uv run pytest tests/unit/test_agents.py -v

# Test routing flow
uv run pytest tests/integration/test_routing_flow.py -v
```

**Tell Claude Code:**
```
Memory system working! Now let's build the agents.

Create:
1. Router agent that classifies messages (SIMPLE/COMPLEX/TOOL)
2. Haiku agent for simple responses
3. Sonnet agent for complex reasoning
4. Judge agent for memory consolidation
5. Tool executor framework

Make sure router caches decisions and records metrics.
```

### Phase 4: User Controls (2 hours)

**What Claude Code Should Build:**
- src/user_controls/commands.py
- src/user_controls/search.py
- src/user_controls/corrections.py
- Tests for command parsing

**Test It:**
```bash
uv run pytest tests/unit/test_commands.py -v
```

**Tell Claude Code:**
```
Agents are working! Now add user control features.

Implement:
1. /remember [important] <content>
2. /forget <query>
3. /search <query>
4. Correction detection ("actually, X is Y")

Test with various command formats.
```

### Phase 5: Security & Monitoring (2-3 hours)

**What Claude Code Should Build:**
- src/security/pii_detector.py
- src/monitoring/cost_tracker.py
- src/monitoring/metrics.py
- src/utils/retry.py
- Tests for error handling

**Test It:**
```bash
uv run pytest tests/unit/test_pii_detector.py -v
uv run pytest tests/unit/test_cost_tracker.py -v
```

**Tell Claude Code:**
```
User controls done! Let's add security and monitoring.

Implement:
1. PII detection with presidio
2. Cost tracking (record every API call)
3. Prometheus metrics
4. Error handling with retries
5. Rate limiting

Include tests for edge cases.
```

### Phase 6: Communication (2 hours)

**What Claude Code Should Build:**
- src/api/main.py (FastAPI app)
- src/api/webhooks.py (Twilio + Discord)
- src/integrations/sms.py
- src/integrations/discord_bot.py
- src/orchestrator/state_manager.py
- src/orchestrator/scheduler.py
- Integration tests for full flows

**Test It:**
```bash
# Start server
uv run uvicorn src.api.main:app --reload

# Test SMS webhook (in another terminal)
curl -X POST http://localhost:8000/webhooks/sms \
  -d "From=+1234567890&Body=hey"

# Run integration tests
uv run pytest tests/integration/test_sms_flow.py -v
```

**Tell Claude Code:**
```
Security and monitoring in place! Now build the communication layer.

Create:
1. FastAPI server with webhook endpoints
2. Twilio SMS integration
3. Discord bot integration
4. State manager (ACTIVE/IDLE/CONSOLIDATING)
5. Task scheduler for judge agent

Test with real webhook calls.
```

### Phase 7: Backups & Obsidian (1-2 hours)

**What Claude Code Should Build:**
- src/memory/backup.py
- src/integrations/obsidian.py
- Backup and restore scripts
- Tests for backup/restore

**Test It:**
```bash
# Run backup
uv run python scripts/backup.sh

# Check S3
# (verify backup file exists)

# Run restore test
uv run pytest tests/integration/test_backup_restore.py -v
```

**Tell Claude Code:**
```
Almost done! Last phase: backups and Obsidian sync.

Implement:
1. Automated daily backups to S3
2. Backup cleanup (keep 30 days)
3. Obsidian vault structure
4. Git-based sync (commit + push)
5. Backup/restore scripts

Test backup and restore functionality.
```

---

## ✅ Verification Checklist

After all phases are complete, verify:

**Infrastructure:**
- [ ] PostgreSQL running with pgvector
- [ ] Redis accessible
- [ ] Migrations applied

**Memory:**
- [ ] Can create and retrieve memories
- [ ] Deduplication works
- [ ] Re-ranking returns relevant results
- [ ] Redis caching hits > 50%

**Agents:**
- [ ] Router classifies correctly
- [ ] Haiku handles simple queries
- [ ] Sonnet handles complex queries
- [ ] Judge consolidates memories

**User Controls:**
- [ ] /remember creates memories
- [ ] /search finds memories
- [ ] Corrections update (not duplicate)

**Security & Monitoring:**
- [ ] PII detection flags sensitive data
- [ ] Cost tracker records usage
- [ ] Prometheus metrics exported
- [ ] Errors retry automatically

**Communication:**
- [ ] SMS messages work
- [ ] Discord commands work
- [ ] State transitions happen
- [ ] Judge runs during idle

**Backups:**
- [ ] Daily backup completes
- [ ] Files upload to S3
- [ ] Restore works
- [ ] Old backups cleaned up

---

## 🧪 Testing the Complete System

### Test 1: Simple Conversation
```
You: "hey what's up"
Expected: Quick casual response via Haiku
Check: Cost tracker shows Haiku usage
```

### Test 2: Complex Query
```
You: "help me plan a video production portfolio showcasing my CS editing work"
Expected: Detailed strategic response via Sonnet
Check: Cost tracker shows Sonnet usage
```

### Test 3: Memory Search
```
You: "/search Marci"
Expected: List of memories about girlfriend
Check: Shows importance scores
```

### Test 4: Explicit Memory
```
You: "/remember important I want to apply to USC film school by March 2025"
Expected: Confirmation message
Check: Memory appears with high importance
```

### Test 5: Correction
```
You: "Actually, Marci's favorite color is blue, not green"
Expected: Updates existing memory
Check: Old memory updated, not duplicated
```

### Test 6: Memory Consolidation
```
1. Have a 10-minute conversation
2. Wait 5+ minutes (system goes idle)
3. Check logs for consolidation
Expected: Judge extracts key facts, deduplicates
Check: Similar memories merged
```

### Test 7: Obsidian Sync
```
Check: obsidian_vault/Memories/ has markdown files
Check: Git commits appear
Check: Files organized by topic/person/date
```

---

## 🐛 Troubleshooting

### Problem: Router always routes to Sonnet
**Solution:**
- Check router system prompt
- Verify Haiku model name is correct
- Test with obviously simple messages like "hi"

### Problem: Memory retrieval returns irrelevant results
**Solution:**
- Check embedding generation
- Verify pgvector index exists
- Review re-ranking weights
- Test with known memories

### Problem: High costs
**Solution:**
- Check cost tracker dashboard
- Verify router is working (should be 80% Haiku)
- Look for runaway consolidation loops
- Check embedding cache hit rate

### Problem: Judge never runs
**Solution:**
- Check idle time calculation
- Verify state manager transitions
- Review scheduler configuration
- Look for stuck states

### Problem: PII detection too aggressive
**Solution:**
- Adjust PII_TYPES list in config
- Disable auto-redact (keep warnings only)
- Whitelist certain patterns

### Problem: Backup fails
**Solution:**
- Check S3 credentials
- Verify bucket exists
- Test pg_dump manually
- Check disk space

---

## 🎨 Customization Points

### Adjust Cost Distribution
Edit routing thresholds in `src/agents/router.py`:
```python
# Make router more aggressive (use more Haiku)
if complexity_score < 3.0:  # was 5.0
    return "SIMPLE"
```

### Change Memory Retention
Edit decay config in `src/memory/schemas.py`:
```python
class DecayConfig(BaseModel):
    rate: float = 0.05  # Slower decay (was 0.1)
    half_life_days: int = 60  # Longer retention (was 30)
```

### Modify Retrieval Balance
Edit re-ranking weights in `src/memory/retrieval.py`:
```python
composite = (
    relevance * 0.5 +        # Increase relevance weight
    importance_score * 0.3 +
    recency_score * 0.1 +    # Decrease recency weight
    access_score * 0.1
)
```

### Add Custom Commands
Extend `src/user_controls/commands.py`:
```python
async def _handle_review(self, command: str, user_id: str) -> str:
    """Review memories from last week."""
    # Your implementation
```

---

## 📊 Expected Performance

**Latency:**
- Router classification: < 10ms
- Memory retrieval: < 100ms
- End-to-end response: < 2 seconds

**Throughput:**
- 10+ concurrent conversations
- 1000+ memories without slowdown

**Reliability:**
- > 99.5% uptime
- Automatic error recovery
- Zero data loss (with backups)

**Cost:**
- 50 msg/day: $1.87/month
- 100 msg/day: $3.12/month
- 200 msg/day: $5.80/month

---

## 🎓 Learning Resources

**While Building:**
- FastAPI docs: fastapi.tiangolo.com
- pgvector docs: github.com/pgvector/pgvector
- Redis docs: redis.io/docs
- Anthropic API: docs.anthropic.com

**After Deployment:**
- Prometheus + Grafana tutorials
- PostgreSQL performance tuning
- Redis cache strategies
- Docker production best practices

---

## 🚀 Going to Production

When you're ready to deploy:

1. **Update .env for production:**
```bash
DEBUG_MODE=false
LOG_LEVEL=INFO
SENTRY_ENVIRONMENT=production
```

2. **Use production Docker Compose:**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

3. **Set up monitoring:**
- Configure Grafana dashboards
- Set up Sentry alerts
- Enable cost budget alerts

4. **Configure backups:**
- Test restore procedure
- Set up backup monitoring
- Document recovery steps

5. **Secure the system:**
- Enable encryption at rest
- Configure rate limiting
- Set up firewall rules
- Use secrets manager for keys

---

## 🎉 Success!

If you've made it through all phases and all tests pass, congratulations! You've built a production-ready autonomous personal assistant.

**Next steps:**
1. Use it daily for a week
2. Monitor costs and performance
3. Tune parameters based on usage
4. Add custom features as needed
5. Consider scaling to multiple users

**Remember:**
- The system learns from every conversation
- Memory quality improves over time
- Cost stays low through smart routing
- Your data is safe with automated backups

Enjoy your new AI assistant! 🚀
