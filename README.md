# 🚀 Autonomous Personal Assistant - Complete Build Package

A production-ready autonomous personal assistant with intelligent routing, robust memory management, and user control. Built to be cheap enough for daily use ($1-2/month), smart enough to be genuinely helpful, and resilient enough to never lose your data.

---

## 📦 What's In This Package

**AGENT_BUILD_SPEC.md** - Complete technical specification
- Full architecture design with routing, memory, and agent systems
- Detailed code examples for every module
- PostgreSQL + Redis + pgvector setup
- Testing strategy and performance targets
- Phase-by-phase build order (15-20 hours total)

**CLAUDE.md** - Project context for Claude Code
- High-level overview and philosophy  
- Tech stack and build strategy
- Common patterns and debugging tips
- User context and cost expectations

**QUICK_START_GUIDE.md** - Step-by-step setup
- How to use this spec with Claude Code
- What to say at each build phase
- Troubleshooting and customization

**.env.example** - Configuration template
- All environment variables with comments
- Security and deployment notes

---

## 🎯 What This System Does

**Multi-Agent Architecture with Cost Optimization**
- Router classifies messages: 80% → cheap model (Haiku), 15% → expensive model (Sonnet), 5% → tools
- Result: 60-80% cost savings vs single-model approach
- Intelligent caching reduces redundant API calls

**Biomimetic Memory System**
- Consolidates during idle periods (like sleep)
- Automatically deduplicates similar memories
- Re-ranks by importance × recency × relevance
- Memories decay unless accessed
- Judge agent autonomously assigns importance

**User Control**
- `/remember` - Explicitly store something
- `/forget` - Delete specific memories
- `/search` - Find memories by topic
- Corrections automatically update existing memories (not duplicate)

**Multi-Channel Communication**
- SMS via Twilio (bidirectional)
- Discord bot with commands
- Can initiate proactive conversations

**Production Features**
- Automated daily backups to S3
- PII detection and optional redaction
- Real-time cost tracking
- Error recovery with retries
- Prometheus metrics + Grafana dashboards
- Multi-user ready (single-user deploy)

**Obsidian Integration**
- Exports memories as structured markdown
- Auto-commit and push via Git
- Organized by topics, people, dates

---

## 💰 Cost Breakdown

At **50 messages/day:**

| Component | Monthly Cost |
|-----------|-------------|
| Router classification | $0.01 |
| Simple queries (80% → Haiku) | $0.29 |
| Complex queries (15% → Sonnet) | $0.64 |
| Tool usage (5% → Sonnet + tools) | $0.29 |
| Memory & Judge | $0.63 |
| **Total** | **~$1.87** |

At 100 messages/day: ~$3.12/month  
At 200 messages/day: ~$5.80/month

**Why it's cheap:** Most conversations are simple. Smart routing uses expensive models only when needed.

---

## 🏗️ Architecture Highlights

### Intelligent Routing
```
"hey what's up" → Router → Haiku → "Hey! How's it going?" → $0.002
"help me plan my portfolio" → Router → Sonnet → [detailed response] → $0.05
"/search film school" → Router → Sonnet + Memory Search → $0.03
```

### Memory Flow
```
New memory → Check for duplicates → Merge similar OR store unique
  ↓
Cache in Redis (hot memories)
  ↓
Available for retrieval (importance × recency × relevance)
```

### Enhanced Retrieval
```
Question → Embed (cached if seen before) → Get top 20 by similarity
  ↓
Re-rank by composite score → Return top 5 → Update access patterns
```

---

## 🚀 Quick Start

### 1. Set Up Project
```bash
mkdir autonomous-assistant
cd autonomous-assistant
mkdir .claude
# Move CLAUDE.md into .claude/
```

### 2. Start Claude Code
```bash
git init
claude-code
```

### 3. Give Claude Code the Spec
```
I want you to build an autonomous personal assistant agent.

Read AGENT_BUILD_SPEC.md - it contains the complete specification.

Build phase by phase:
1. Infrastructure (PostgreSQL + Redis)
2. Memory system  
3. Router & Agents
4. User Controls
5. Security & Monitoring
6. Communication
7. Backups & Obsidian

Let's start with Phase 1: Infrastructure. Set up Docker Compose with PostgreSQL + pgvector and Redis.
```

### 4. Build Phase by Phase
Claude Code follows the spec, testing after each module.

### 5. Deploy
```bash
# Test
uv run pytest

# Run locally
docker-compose up -d
uv run uvicorn src.api.main:app --reload

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🔧 Tech Stack

| Component | Technology |
|-----------|-----------|
| Language | Python 3.11+ |
| Package Manager | uv (10-100x faster than pip) |
| Web Framework | FastAPI (async) |
| Database | PostgreSQL 15+ with pgvector |
| Cache | Redis 7+ |
| Router Agent | Claude Haiku 4 |
| Simple Agent | Claude Haiku 4 |
| Complex Agent | Claude Sonnet 4.5 |
| Judge Agent | GPT-4o-mini |
| Embeddings | text-embedding-3-small |
| SMS | Twilio |
| Discord | Discord.py |
| Monitoring | Prometheus + Grafana |
| Error Tracking | Sentry |
| Backups | S3-compatible (Backblaze B2) |

---

## 💡 Key Features

**Cost Optimization:**
- Smart routing saves 60-80% vs single model
- Aggressive caching (embeddings, routing, hot memories)
- Per-operation cost tracking with budget alerts

**Memory Intelligence:**
- Semantic search with pgvector
- Two-stage retrieval with re-ranking
- Automatic deduplication of similar memories
- Adaptive decay (memories fade unless used)
- Correction detection (updates vs duplicates)

**User Experience:**
- Natural conversations via SMS/Discord
- Explicit memory control via commands
- Proactive check-ins and reminders
- Fast responses (< 2 seconds)
- Never loses data (automated backups)

**Production Ready:**
- Automated daily backups to S3
- PII detection (flags sensitive data)
- Rate limiting (prevents abuse)
- Error recovery (retries with backoff)
- Health checks and monitoring
- Multi-user architecture (ready to scale)

---

## 📊 Success Metrics

You'll know it's working when:

✅ SMS/Discord conversations feel natural and contextual  
✅ Agent accurately remembers past discussions  
✅ Costs stay under $2/month at moderate usage  
✅ Consolidation runs automatically after idle  
✅ Memories appear in Obsidian vault  
✅ Similar memories get merged (not duplicated)  
✅ Proactive check-ins happen appropriately  
✅ Low-value memories get pruned  
✅ System recovers from errors gracefully  

---

## 🎓 What You'll Learn

- Vector databases and semantic search (pgvector)
- Multi-agent AI with cost optimization
- Async Python and FastAPI webhooks
- Redis caching patterns
- Memory consolidation algorithms
- Agent orchestration and routing
- Test-driven development
- State management patterns
- Cost tracking and monitoring
- Production deployment (Docker)

---

## 🔮 Future Enhancements

After you have the base system working:

- Voice integration (phone calls)
- Calendar integration (Google Calendar)
- Email monitoring (auto-respond)
- Web interface (browse memories visually)
- Advanced analytics (usage insights)
- Fine-tuned embeddings (custom model)
- Multi-user support (separate memory spaces)
- Export/import (backup and restore)

---

## 📞 Next Steps

1. Review all documents (README, spec, CLAUDE.md, guide)
2. Get API keys (Anthropic, OpenAI, Twilio, Discord)
3. Set up project directory
4. Start Claude Code with the spec
5. Build phase by phase, test thoroughly
6. Test with real conversations
7. Deploy when ready

---

## 🙏 Final Thoughts

This isn't just a chatbot. It's a memory system that consolidates during "sleep", prunes irrelevant information, surfaces relevant context naturally, costs less than a coffee per month, and never loses your data.

The architecture is clean, the spec is detailed, and Claude Code can build it. Take your time, test thoroughly, and enjoy the result.

Good luck! 🚀
