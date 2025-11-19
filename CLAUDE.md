# Autonomous Personal Assistant Agent

## Project Context

This is a production-ready autonomous personal assistant with intelligent cost optimization, robust memory management, and user control. The system features smart agent routing, automated memory consolidation, and bidirectional communication via SMS and Discord.

## Core Philosophy

**Smart Routing:**
Not all queries need the expensive model. Route simple queries to cheap models, complex ones to premium models. This saves 60-80% on operating costs.

**Memory as an Active System:**
Memory isn't just storage - it's an active process that:
- Consolidates during idle periods (like human sleep)
- Assigns importance autonomously (judge agent decides)
- Deduplicates similar memories automatically
- Decays over time unless accessed
- Updates when corrected, doesn't duplicate

**User Control:**
The user can explicitly control their memory:
- `/remember` - Force store something important
- `/forget` - Delete specific memories
- `/search` - Find memories by topic
- Corrections automatically update existing memories

## Architecture Overview

```
Main Orchestrator
├── Router Agent (classifies messages)
│   ├── Simple (80%) → Haiku ($0.25/1M tokens)
│   ├── Complex (15%) → Sonnet ($3/1M tokens)
│   └── Tool-needing (5%) → Sonnet + Tools
├── Judge Agent (memory consolidation during idle)
└── Retrieval Agent (injects relevant memories)

Memory Layer
├── PostgreSQL + pgvector (vector + relational)
├── Redis (caching hot data)
└── S3-compatible storage (automated backups)

Communication Layer
├── Twilio SMS (bidirectional)
└── Discord Bot (commands, notifications)

Obsidian Integration
└── Git-based sync (markdown exports)
```

## Tech Stack

- **Language:** Python 3.11+
- **Framework:** FastAPI for webhooks
- **Database:** PostgreSQL 15+ with pgvector extension
- **Cache:** Redis 7+ for hot data
- **Agents:** Anthropic API (Haiku + Sonnet) + OpenAI (Judge, Embeddings)
- **Integrations:** Twilio, Discord.py, GitPython
- **Monitoring:** Prometheus, Grafana, Sentry
- **Dev Tools:** uv, ruff, pytest

## Build Strategy

Build in phases, testing after each module:

**Phase 1: Infrastructure**
- PostgreSQL + pgvector + Redis setup
- Database schema and migrations
- Connection pooling

**Phase 2: Memory Foundation**
- Enhanced memory schemas
- PostgreSQL + Redis wrapper
- Embedding generation with cache
- Enhanced retrieval with re-ranking
- Deduplication logic

**Phase 3: Router & Agents**
- Router for message classification
- Haiku agent for simple responses
- Sonnet agent for complex reasoning
- Judge agent for consolidation
- Tool executor framework

**Phase 4: User Controls**
- Memory command parser
- /remember, /forget, /search commands
- Correction detection

**Phase 5: Security & Monitoring**
- PII detection
- Cost tracking
- Prometheus metrics
- Error handling and retries

**Phase 6: Communication**
- FastAPI server
- Twilio + Discord integrations
- State manager
- Task scheduler

**Phase 7: Backups & Obsidian**
- Automated backup to S3
- Obsidian sync with git

## Code Style

- Use type hints for all functions
- Pydantic models for data validation
- Async/await for I/O operations
- Structured logging with context
- Environment variables for config
- Dependency injection

## Testing Requirements

- **Coverage:** > 80%
- **Unit tests:** Individual functions/classes
- **Integration tests:** Complete workflows
- **Performance tests:** Retrieval speed, concurrent load
- **Mocks:** External APIs (Anthropic, Twilio, Discord)
- **Fixtures:** Reusable test data

## Common Patterns

**Message Routing:**
```python
route = router.classify(message)  # SIMPLE, COMPLEX, or TOOL
if route.classification == "SIMPLE":
    agent = haiku
elif route.classification == "COMPLEX":
    agent = sonnet
else:
    agent = sonnet_with_tools
```

**Memory Retrieval:**
```python
# Two-stage: vector search → re-rank
candidates = vector_search(query, top_k=20)
scored = re_rank(candidates, by=[importance, recency, relevance])
memories = scored[:5]
```

**Memory Entry:**
```python
class MemoryEntry(BaseModel):
    content: str
    embedding: vector
    importance: ImportanceScore  # base + access_boost + recency
    decay: DecayConfig  # rate, half_life, minimum
    deduplication: ClusterInfo  # similar memories merged
    access_pattern: AccessPattern  # count, frequency, last_accessed
```

## Key Files

- `src/agents/router.py` - Message classification
- `src/agents/haiku.py` - Simple/cheap responses
- `src/agents/sonnet.py` - Complex/expensive responses
- `src/agents/judge.py` - Memory consolidation
- `src/memory/store.py` - PostgreSQL + pgvector wrapper
- `src/memory/cache.py` - Redis caching layer
- `src/memory/deduplicator.py` - Find and merge similar memories
- `src/memory/retrieval.py` - Enhanced retrieval with re-ranking
- `src/user_controls/commands.py` - User memory commands
- `src/security/pii_detector.py` - PII detection
- `src/monitoring/cost_tracker.py` - Token usage tracking
- `src/orchestrator/state_manager.py` - State transitions

## Environment Setup

```bash
# Install dependencies
uv sync

# Start databases
docker-compose up -d postgres redis

# Run migrations
uv run alembic upgrade head

# Copy environment template
cp .env.example .env
# Edit .env with your keys

# Run tests
uv run pytest

# Start server
uv run uvicorn src.api.main:app --reload
```

## Important Constraints

1. **Never hardcode API keys** - use environment variables
2. **Always use async for I/O** - FastAPI is async
3. **Validate all inputs** - use Pydantic models
4. **Log state changes** - especially routing decisions
5. **Test before integrating** - each module independently
6. **Cache aggressively** - embeddings, routing decisions
7. **Monitor costs** - track every API call

## User Context

The user (Dylan) is:
- 22, customer service worker, studying video production
- Lives in upstate NY with his dad
- Has a girlfriend (Marci) in long-distance relationship
- Passionate about philosophy, filmmaking, AI/ML
- Wants the agent to help with daily tasks and provide a "second brain"
- Cost-conscious - wants cheap but powerful

## Cost Expectations

At 50 messages/day:
- Router: ~$0.01/month
- Simple queries (80%): ~$0.29/month
- Complex queries (15%): ~$0.64/month
- Tool usage (5%): ~$0.29/month
- Memory operations: ~$0.64/month
- **Total: ~$1.87/month**

At 100 messages/day: ~$3.72/month

The smart routing saves 60-80% compared to using premium models for everything.

## Performance Targets

- Message routing: < 10ms
- Memory retrieval: < 100ms for 1000s of memories
- End-to-end response: < 2 seconds
- Concurrent queries: Support 10+ simultaneous
- Uptime: > 99.5%

## Debugging

**Router not classifying correctly:**
- Check router system prompt
- Verify Haiku model is working
- Review classification examples

**Memory retrieval poor:**
- Check embedding generation
- Verify pgvector indexing
- Review re-ranking weights
- Check if memories are being accessed

**High costs:**
- Check cost tracker dashboard
- Verify router is working (should be 80% Haiku)
- Look for runaway consolidation
- Check for embedding cache misses

**State transitions stuck:**
- Check idle time calculation
- Verify state manager logic
- Review scheduler configuration

## Next Steps

Follow the AGENT_BUILD_SPEC.md document for detailed implementation instructions. Build phase by phase, test thoroughly, and maintain clean separation of concerns.

The goal: An agent that's cheap enough to use daily, smart enough to be helpful, and resilient enough to not lose your data.
