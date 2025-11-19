# Autonomous Personal Assistant Agent - Build Specification

## Project Overview

Build a production-ready autonomous personal assistant with intelligent routing, robust memory management, and user control. The system uses a multi-agent architecture where different models handle different types of work, optimizing for both cost and quality.

**Philosophy:** Be smart about what you spend. Route cheap for simple queries, expensive for complex reasoning. Remember what matters, forget what doesn't. Let the user control everything.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│               Main Orchestrator                          │
│  (State management, message routing, task scheduling)   │
└─────────┬──────────────────────┬────────────────────────┘
          │                      │
          │         ┌────────────▼──────────────┐
          │         │      Router Agent         │
          │         │  (Haiku - classifies       │
          │         │   message complexity)      │
          │         └────────────┬───────────────┘
          │                      │
          │         ┌────────────┼───────────────┐
          │         │            │               │
    ┌─────▼─────┐  ┌───▼────┐  ┌──▼───┐  ┌────▼─────┐
    │   Judge   │  │ Haiku  │  │Sonnet│  │  Tool    │
    │   Agent   │  │Response│  │ Agent│  │ Executor │
    │(GPT-4o-   │  │        │  │      │  │          │
    │  mini)    │  │        │  │      │  │          │
    └─────┬─────┘  └────────┘  └──┬───┘  └────┬─────┘
          │                       │            │
          │         ┌─────────────┴────────────┘
          │         │
          └─────────▼─────────────────────────────────────┐
                    │     Memory Layer                    │
                    │  ┌─────────────────────────────┐    │
                    │  │  Redis Cache (Hot Memories) │    │
                    │  └──────────┬──────────────────┘    │
                    │  ┌──────────▼──────────────────┐    │
                    │  │  PostgreSQL + pgvector      │    │
                    │  │  - Embeddings               │    │
                    │  │  - Metadata                 │    │
                    │  │  - User data                │    │
                    │  │  - Access patterns          │    │
                    │  └─────────────────────────────┘    │
                    └─────────────────────────────────────┘
```

### How The System Works

**Message Flow:**
1. User sends message via SMS or Discord
2. Router agent classifies: SIMPLE, COMPLEX, or TOOL
3. Route to appropriate agent (Haiku for simple, Sonnet for complex)
4. Agent retrieves relevant memories if needed
5. Agent generates response
6. Response sent back to user
7. Conversation logged for later consolidation

**Memory Consolidation (During Idle):**
1. Judge agent reviews conversation transcripts
2. Extracts important facts, decisions, preferences
3. Detects similar memories (deduplication)
4. Merges duplicates, assigns importance scores
5. Prunes low-value, unused memories
6. Exports to Obsidian vault via Git

**Cost Optimization:**
- 80% of messages are simple → Haiku ($0.25/1M tokens)
- 15% are complex → Sonnet ($3/1M tokens)
- 5% need tools → Sonnet + function calling
- Result: ~$1-2/month at moderate usage

---

## Technology Stack

### Core Technologies

**Language & Framework:**
- Python 3.11+
- FastAPI with async support
- Uvicorn for ASGI server

**Memory & Storage:**
- PostgreSQL 15+ with pgvector extension (vector + relational in one)
- Redis 7+ for caching (hot memories, embeddings, rate limiting)
- S3-compatible storage for backups (Backblaze B2 or AWS S3)

**Agent Models:**
- **Router:** Claude Haiku 4 (~$0.25/1M tokens) - Fast, cheap classification
- **Simple Queries:** Claude Haiku 4 - Handles 80% of conversations
- **Complex Queries:** Claude Sonnet 4.5 - Handles 15% of conversations  
- **Tool-Heavy Tasks:** Claude Sonnet 4.5 with function calling - 5% of conversations
- **Judge Agent:** GPT-4o-mini (~$0.15/1M input) - Structured consolidation
- **Embeddings:** text-embedding-3-small (~$0.02/1M tokens) - Cheap, good quality

**Integrations:**
- Twilio for SMS (bidirectional)
- Discord.py for Discord bot
- GitPython for Obsidian vault sync
- Sentry for error tracking
- Prometheus client for metrics

**Development Tools:**
- uv for package management (10-100x faster than pip)
- ruff for linting
- pytest + pytest-asyncio for testing
- Docker + docker-compose for deployment
- pre-commit hooks for code quality

**Security:**
- SQLCipher for encryption at rest (or PostgreSQL pgcrypto)
- presidio for PII detection
- python-dotenv for env management
- Twilio signature validation
- Rate limiting per user

---

## Project Structure

```
autonomous-assistant/
├── .claude/
│   ├── CLAUDE.md
│   └── commands/
│       ├── test.md
│       ├── deploy.md
│       ├── backup.md
│       └── cost-report.md
│
├── src/
│   ├── __init__.py
│   │
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── base.py              # Base agent interface
│   │   ├── router.py            # Route to cheap/expensive agents
│   │   ├── haiku.py             # Fast cheap responses
│   │   ├── sonnet.py            # Complex conversations
│   │   ├── judge.py             # Memory consolidation
│   │   ├── retrieval.py         # Memory retrieval with re-ranking
│   │   └── tool_executor.py     # Execute tools/functions
│   │
│   ├── memory/
│   │   ├── __init__.py
│   │   ├── store.py             # PostgreSQL + pgvector wrapper
│   │   ├── cache.py             # Redis caching layer
│   │   ├── schemas.py           # Memory data models
│   │   ├── consolidator.py      # Memory consolidation with dedup
│   │   ├── deduplicator.py      # Find and merge similar memories
│   │   ├── pruner.py            # Memory decay and pruning
│   │   ├── embeddings.py        # Embedding generation with cache
│   │   ├── retrieval.py         # Enhanced retrieval with re-ranking
│   │   └── backup.py            # Automated backups
│   │
│   ├── user_controls/
│   │   ├── __init__.py
│   │   ├── commands.py          # User memory commands
│   │   ├── search.py            # Memory search interface
│   │   └── corrections.py       # Detect and apply corrections
│   │
│   ├── security/
│   │   ├── __init__.py
│   │   ├── encryption.py        # Encryption at rest
│   │   ├── pii_detector.py      # PII detection and redaction
│   │   └── rate_limiter.py      # Rate limiting
│   │
│   ├── monitoring/
│   │   ├── __init__.py
│   │   ├── metrics.py           # Prometheus metrics
│   │   ├── cost_tracker.py      # Track token usage and costs
│   │   └── health.py            # Health checks
│   │
│   ├── integrations/
│   │   ├── __init__.py
│   │   ├── sms.py               # Twilio SMS with retry logic
│   │   ├── discord_bot.py       # Discord bot with commands
│   │   └── obsidian.py          # Git-based Obsidian sync
│   │
│   ├── orchestrator/
│   │   ├── __init__.py
│   │   ├── state_manager.py     # State management
│   │   ├── scheduler.py         # Task scheduling
│   │   ├── router.py            # Message routing logic
│   │   └── error_handler.py     # Error recovery
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app
│   │   ├── webhooks.py          # Webhook endpoints
│   │   ├── admin.py             # Admin endpoints
│   │   └── middleware.py        # Auth, rate limiting
│   │
│   └── utils/
│       ├── __init__.py
│       ├── config.py            # Configuration management
│       ├── logging.py           # Structured logging
│       ├── helpers.py           # Utility functions
│       └── retry.py             # Retry logic with backoff
│
├── tests/
│   ├── __init__.py
│   ├── unit/
│   │   ├── test_router.py
│   │   ├── test_deduplication.py
│   │   ├── test_cache.py
│   │   ├── test_memory_store.py
│   │   ├── test_agents.py
│   │   └── test_consolidation.py
│   ├── integration/
│   │   ├── test_routing_flow.py
│   │   ├── test_sms_flow.py
│   │   ├── test_discord_flow.py
│   │   ├── test_memory_lifecycle.py
│   │   └── test_backup_restore.py
│   ├── performance/
│   │   ├── test_retrieval_speed.py
│   │   └── test_concurrent_load.py
│   └── fixtures/
│       └── sample_data.py
│
├── migrations/                   # Database migrations
│   └── versions/
│
├── scripts/                      # Utility scripts
│   ├── backup.sh
│   ├── restore.sh
│   └── cost_report.py
│
├── obsidian_vault/
│   ├── .git/
│   ├── Memories/
│   │   ├── Daily/
│   │   ├── Topics/
│   │   └── People/
│   ├── Tasks/
│   └── Analytics/
│
├── data/
│   ├── postgres/                # PostgreSQL data
│   ├── redis/                   # Redis data
│   ├── backups/                 # Local backups
│   └── logs/
│
├── .env.example
├── .env
├── .gitignore
├── pyproject.toml
├── Dockerfile
├── docker-compose.yml
├── README.md
└── Makefile
```

---

## Detailed Module Specifications

### 1. Router Agent - Cost Optimization

The router is the first agent to see every message. Its job: classify complexity and route to the right model.

**Decision Tree:**
```
Incoming message
    │
    ├─> Simple query? (facts, greetings, simple Q&A)
    │   └─> Haiku ($0.25/1M tokens)
    │
    ├─> Complex query? (analysis, creative, multi-step reasoning)
    │   └─> Sonnet ($3/1M tokens)
    │
    └─> Needs tools? (memory search, tasks, reminders)
        └─> Sonnet + Tool Executor
```

**Classification Prompt:**
```python
ROUTER_SYSTEM_PROMPT = """
You are a message router. Classify the user's message into ONE category:

1. SIMPLE - Greetings, simple facts, yes/no, casual chat
2. COMPLEX - Analysis, creative tasks, multi-step reasoning, advice
3. TOOL - Needs memory search, task creation, reminders, web search

Examples:
- "hey what's up" → SIMPLE
- "tell me about Marci" → TOOL (needs memory search)
- "help me plan my video production portfolio" → COMPLEX
- "what's 2+2" → SIMPLE
- "remind me to call mom tomorrow" → TOOL

Respond with ONLY: SIMPLE, COMPLEX, or TOOL
"""
```

**Implementation Pattern:**
```python
# src/agents/router.py

class RouterAgent:
    def __init__(self):
        self.client = Anthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-haiku-4-20250514"
        self.metrics = MetricsCollector()
        
    async def classify(self, message: str, context: Optional[Dict] = None) -> RouteDecision:
        """Classify message and decide routing."""
        
        # Check cache first - common messages get cached
        cache_key = f"route:{hash(message)}"
        cached = await redis_client.get(cache_key)
        if cached:
            self.metrics.record_cache_hit("router")
            return RouteDecision.parse_raw(cached)
        
        # Call Haiku for classification
        start = time.time()
        response = self.client.messages.create(
            model=self.model,
            max_tokens=10,  # Just need one word
            system=ROUTER_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": message}]
        )
        
        classification = response.content[0].text.strip()
        latency = time.time() - start
        
        # Record metrics for monitoring
        self.metrics.record_routing(
            classification=classification,
            latency=latency,
            tokens_used=response.usage.input_tokens + response.usage.output_tokens
        )
        
        # Build decision
        decision = RouteDecision(
            classification=classification,
            target_agent="haiku" if classification == "SIMPLE" else "sonnet",
            needs_memory=classification in ["COMPLEX", "TOOL"],
            needs_tools=classification == "TOOL",
            confidence=0.9,
            reasoning=f"Classified as {classification}"
        )
        
        # Cache for 1 hour
        await redis_client.setex(cache_key, 3600, decision.json())
        
        return decision
```

### 2. Memory System Architecture

**Memory Entry Schema:**
```python
# src/memory/schemas.py

class ImportanceScore(BaseModel):
    """Multi-faceted importance scoring."""
    base_score: float = Field(ge=0.0, le=10.0)
    access_boost: float = 0.0
    recency_factor: float = 1.0
    user_override: Optional[float] = None

class DecayConfig(BaseModel):
    """How fast memory fades."""
    rate: float = Field(ge=0.0, le=1.0, default=0.1)
    half_life_days: int = 30
    minimum_importance: float = 2.0

class AccessPattern(BaseModel):
    """Track how memory is used."""
    access_count: int = 0
    last_accessed: datetime
    access_frequency: float = 0.0
    retrieval_success_rate: float = 0.0

class DeduplicationInfo(BaseModel):
    """Tracks merged memories."""
    cluster_id: Optional[str] = None
    similar_memory_ids: List[str] = []
    merged_count: int = 1

class MemoryEntry(BaseModel):
    """Complete memory with all metadata."""
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    content: str
    embedding: List[float]
    
    # Importance and decay
    importance: ImportanceScore = Field(default_factory=ImportanceScore)
    decay: DecayConfig = Field(default_factory=DecayConfig)
    
    # Deduplication
    deduplication: DeduplicationInfo = Field(default_factory=DeduplicationInfo)
    
    # Access tracking
    access_pattern: AccessPattern = Field(default_factory=AccessPattern)
    
    # Metadata
    topics: List[str] = []
    entities: List[Dict] = []  # People, places, things
    memory_type: str = "episodic"  # episodic, semantic, procedural
    source: str = "conversation"  # conversation, user_explicit, consolidation
    pii_detected: List[str] = []
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

**PostgreSQL Schema:**
```sql
-- migrations/001_initial_schema.sql

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table (multi-user ready)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) UNIQUE,
    discord_id VARCHAR(50) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    settings JSONB DEFAULT '{}'::jsonb
);

-- Memories table with vector support
CREATE TABLE memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536),  -- text-embedding-3-small dimension
    
    -- Importance scoring
    base_importance FLOAT DEFAULT 5.0,
    access_boost FLOAT DEFAULT 0.0,
    recency_factor FLOAT DEFAULT 1.0,
    user_override_importance FLOAT,
    
    -- Decay configuration
    decay_rate FLOAT DEFAULT 0.1,
    half_life_days INT DEFAULT 30,
    minimum_importance FLOAT DEFAULT 2.0,
    
    -- Deduplication
    cluster_id UUID,
    similar_memory_ids UUID[],
    merged_count INT DEFAULT 1,
    
    -- Access patterns
    access_count INT DEFAULT 0,
    last_accessed TIMESTAMP,
    access_frequency FLOAT DEFAULT 0.0,
    retrieval_success_rate FLOAT DEFAULT 0.0,
    
    -- Metadata
    topics TEXT[],
    entities JSONB,
    sentiment FLOAT,
    memory_type VARCHAR(50) DEFAULT 'episodic',
    source VARCHAR(50),
    pii_detected TEXT[],
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_memories_user ON memories(user_id);
CREATE INDEX idx_memories_importance ON memories(base_importance);
CREATE INDEX idx_memories_accessed ON memories(last_accessed);
CREATE INDEX idx_memories_topics ON memories USING GIN(topics);

-- Vector similarity search index (HNSW for speed)
CREATE INDEX idx_memories_embedding ON memories 
USING hnsw (embedding vector_cosine_ops);

-- Token usage tracking
CREATE TABLE token_usage (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    model VARCHAR(50),
    operation VARCHAR(50),
    input_tokens INT,
    output_tokens INT,
    cost DECIMAL(10, 6),
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_token_usage_user_date ON token_usage(user_id, timestamp);
```

### 3. Memory Deduplication

**Problem:** After weeks, you'll have "Dylan loves filmmaking" mentioned 50 times.
**Solution:** Cluster similar memories, merge duplicates, reinforce importance.

```python
# src/memory/deduplicator.py

class MemoryDeduplicator:
    def __init__(self):
        self.similarity_threshold = 0.92  # Very similar
        self.merge_threshold = 0.85  # Similar enough to cluster
        
    async def deduplicate_batch(self, memories: List[MemoryEntry]) -> DeduplicationResult:
        """Find and merge similar memories."""
        
        # 1. Compute pairwise similarity
        embeddings = [m.embedding for m in memories]
        similarity_matrix = cosine_similarity(embeddings)
        
        # 2. Find clusters of similar memories
        clusters = self._cluster_memories(similarity_matrix, memories)
        
        # 3. For each cluster, merge into canonical memory
        merged_memories = []
        for cluster in clusters:
            if len(cluster) > 1:
                canonical = self._merge_cluster(cluster)
                merged_memories.append(canonical)
            else:
                merged_memories.append(cluster[0])
        
        return DeduplicationResult(
            original_count=len(memories),
            merged_count=len(merged_memories),
            clusters=clusters
        )
    
    def _merge_cluster(self, memories: List[MemoryEntry]) -> MemoryEntry:
        """Merge similar memories into one canonical memory."""
        
        # Sort by importance
        memories.sort(key=lambda m: m.importance.base_score, reverse=True)
        canonical = memories[0]
        
        # Boost importance based on frequency
        frequency_boost = min(len(memories) * 0.5, 2.0)
        
        # Merge access patterns
        total_accesses = sum(m.access_pattern.access_count for m in memories)
        
        return MemoryEntry(
            content=canonical.content,  # Keep best content
            embedding=canonical.embedding,
            importance=ImportanceScore(
                base_score=min(canonical.importance.base_score + frequency_boost, 10.0),
                access_boost=frequency_boost
            ),
            deduplication=DeduplicationInfo(
                cluster_id=str(uuid.uuid4()),
                similar_memory_ids=[m.id for m in memories[1:]],
                merged_count=len(memories)
            ),
            access_pattern=AccessPattern(
                access_count=total_accesses,
                last_accessed=max(m.access_pattern.last_accessed for m in memories)
            ),
            topics=list(set(sum([m.topics for m in memories], []))),
            user_id=canonical.user_id
        )
```

### 4. Enhanced Retrieval with Re-Ranking

**The Problem:** Similarity ≠ usefulness. Recent irrelevant memories beat important old ones.
**The Solution:** Two-stage retrieval + composite scoring.

```python
# src/memory/retrieval.py

class EnhancedRetrieval:
    def __init__(self):
        self.initial_k = 20  # Get more candidates
        self.final_k = 5     # Return top 5
        
    async def retrieve(
        self, 
        query: str, 
        user_id: str,
        context: Optional[Dict] = None
    ) -> List[MemoryEntry]:
        """Two-stage retrieval with re-ranking."""
        
        # Stage 1: Vector similarity search (get 20 candidates)
        query_embedding = await self.embed(query)
        candidates = await self.vector_search(
            embedding=query_embedding,
            user_id=user_id,
            top_k=self.initial_k
        )
        
        # Stage 2: Re-rank by composite score
        scored_candidates = []
        for memory in candidates:
            score = self._compute_composite_score(
                memory=memory,
                query_embedding=query_embedding,
                context=context
            )
            scored_candidates.append((score, memory))
        
        # Sort by composite score
        scored_candidates.sort(key=lambda x: x[0], reverse=True)
        
        # Update access patterns
        top_memories = [m for _, m in scored_candidates[:self.final_k]]
        await self._update_access_patterns(top_memories)
        
        return top_memories
    
    def _compute_composite_score(
        self,
        memory: MemoryEntry,
        query_embedding: List[float],
        context: Optional[Dict]
    ) -> float:
        """Compute weighted score: importance × recency × relevance."""
        
        # Relevance: cosine similarity
        relevance = cosine_similarity([query_embedding], [memory.embedding])[0][0]
        
        # Importance: with decay applied
        days_old = (datetime.utcnow() - memory.created_at).days
        decayed_importance = memory.importance.base_score * (
            1 - memory.decay.rate * days_old
        )
        decayed_importance = max(decayed_importance, memory.decay.minimum_importance)
        importance_score = decayed_importance / 10.0  # Normalize to 0-1
        
        # Recency: exponential decay
        recency_score = math.exp(-days_old / 30)  # Half-life of 30 days
        
        # Access pattern: frequently accessed memories rank higher
        access_score = min(memory.access_pattern.access_frequency, 1.0)
        
        # Weighted composite score
        composite = (
            relevance * 0.4 +
            importance_score * 0.3 +
            recency_score * 0.2 +
            access_score * 0.1
        )
        
        # Boost if user explicitly flagged as important
        if memory.importance.user_override:
            composite *= 1.2
        
        return composite
```

### 5. User Memory Commands

**Let the user control their memory.**

```python
# src/user_controls/commands.py

class MemoryCommands:
    """User-facing memory control commands."""
    
    async def handle_command(self, command: str, user_id: str) -> str:
        """Parse and execute user memory command."""
        
        if command.startswith("/remember"):
            return await self._handle_remember(command, user_id)
        elif command.startswith("/forget"):
            return await self._handle_forget(command, user_id)
        elif command.startswith("/search"):
            return await self._handle_search(command, user_id)
        elif command.startswith("/important"):
            return await self._handle_mark_important(command, user_id)
        else:
            return "Unknown command. Try /remember, /forget, /search, or /important"
    
    async def _handle_remember(self, command: str, user_id: str) -> str:
        """Explicitly add a memory with optional importance.
        
        Examples:
            /remember I want to apply to USC film school by March
            /remember important My cat Sneakers loves paper towels
        """
        parts = command.split(maxsplit=2)
        if len(parts) < 2:
            return "Usage: /remember [important] <what to remember>"
        
        is_important = parts[1].lower() == "important"
        content = parts[2] if is_important else parts[1]
        
        memory = await self.memory_store.create_memory(
            content=content,
            user_id=user_id,
            importance=ImportanceScore(
                base_score=9.0 if is_important else 7.0,
                user_override=9.0 if is_important else None
            ),
            source="user_explicit"
        )
        
        return f"✓ Remembered: {content[:100]}..."
    
    async def _handle_search(self, command: str, user_id: str) -> str:
        """Search your own memories."""
        query = command.split(maxsplit=1)[1]
        
        memories = await self.memory_store.search(
            query=query,
            user_id=user_id,
            top_k=5
        )
        
        if not memories:
            return f"No memories found for '{query}'"
        
        results = []
        for i, memory in enumerate(memories, 1):
            results.append(
                f"{i}. [{memory.importance.base_score:.1f}/10] {memory.content[:100]}..."
            )
        
        return "\n".join(results)
```

### 6. Correction Detection

**Problem:** User says "Actually, X is Y not Z" - should update existing memory, not create new one.

```python
# src/user_controls/corrections.py

class CorrectionDetector:
    """Detect when user is correcting previous information."""
    
    CORRECTION_PATTERNS = [
        r"actually,?\s+(.+)",
        r"no,?\s+(.+)",
        r"correction:?\s+(.+)",
        r"i meant\s+(.+)",
        r"not\s+\w+,?\s+(.+)",
    ]
    
    async def detect_and_apply(
        self,
        message: str,
        user_id: str,
        conversation_history: List[str]
    ) -> Optional[CorrectionResult]:
        """Detect if message is a correction and apply it."""
        
        # Check if message matches correction pattern
        is_correction = any(
            re.match(pattern, message.lower())
            for pattern in self.CORRECTION_PATTERNS
        )
        
        if not is_correction:
            return None
        
        # Use LLM to extract what's being corrected
        correction_info = await self._extract_correction_info(
            message, conversation_history
        )
        
        if not correction_info:
            return None
        
        # Find memory to update
        old_memories = await self.memory_store.search(
            query=correction_info.old_value,
            user_id=user_id,
            top_k=3
        )
        
        if not old_memories:
            return None
        
        # Update the most relevant memory
        best_match = old_memories[0]
        updated_content = best_match.content.replace(
            correction_info.old_value,
            correction_info.new_value
        )
        
        await self.memory_store.update(
            memory_id=best_match.id,
            content=updated_content,
            metadata={
                "corrected": True,
                "correction_date": datetime.utcnow().isoformat()
            }
        )
        
        return CorrectionResult(
            detected=True,
            old_memory=best_match,
            new_content=updated_content
        )
```

### 7. Cost Tracking & Monitoring

```python
# src/monitoring/cost_tracker.py

class CostTracker:
    """Track token usage and costs in real-time."""
    
    # Pricing per 1M tokens
    PRICING = {
        "claude-haiku-4": {"input": 0.25, "output": 1.25},
        "claude-sonnet-4.5": {"input": 3.0, "output": 15.0},
        "gpt-4o-mini": {"input": 0.15, "output": 0.60},
        "text-embedding-3-small": {"input": 0.02, "output": 0.0},
    }
    
    async def record_usage(
        self,
        user_id: str,
        model: str,
        input_tokens: int,
        output_tokens: int,
        operation: str
    ):
        """Record token usage and compute cost."""
        
        pricing = self.PRICING.get(model, {"input": 0.0, "output": 0.0})
        
        cost = (
            (input_tokens / 1_000_000) * pricing["input"] +
            (output_tokens / 1_000_000) * pricing["output"]
        )
        
        # Store in PostgreSQL
        await self.db.execute(
            """
            INSERT INTO token_usage (
                user_id, model, operation, input_tokens, output_tokens, cost, timestamp
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            """,
            user_id, model, operation, input_tokens, output_tokens, cost, datetime.utcnow()
        )
        
        # Update Prometheus metrics
        self.metrics.record_cost(user_id=user_id, cost=cost)
        
        # Check budget limits
        await self._check_budget_limits(user_id)
    
    async def get_daily_report(self, user_id: str) -> CostReport:
        """Get cost report for today."""
        
        result = await self.db.fetchone(
            """
            SELECT 
                COUNT(*) as operations,
                SUM(input_tokens + output_tokens) as total_tokens,
                SUM(cost) as total_cost
            FROM token_usage
            WHERE user_id = $1 AND timestamp >= CURRENT_DATE
            """,
            user_id
        )
        
        return CostReport(
            date=datetime.utcnow().date(),
            operations=result[0],
            total_tokens=result[1],
            total_cost=result[2]
        )
```

### 8. Automated Backups

```python
# src/memory/backup.py

class BackupManager:
    """Automated backups to S3-compatible storage."""
    
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key
        )
        
    async def run_daily_backup(self):
        """Full backup of PostgreSQL database."""
        
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        backup_file = f"/tmp/backup_{timestamp}.sql.gz"
        
        try:
            # Dump database
            await self._pg_dump(backup_file)
            
            # Upload to S3
            s3_key = f"backups/daily/{timestamp}.sql.gz"
            await self._upload_to_s3(backup_file, s3_key)
            
            # Record in database
            file_size = os.path.getsize(backup_file)
            await self.db.execute(
                """
                INSERT INTO backups (backup_type, file_path, size_bytes, status)
                VALUES ($1, $2, $3, $4)
                """,
                "full", s3_key, file_size, "completed"
            )
            
            # Clean up old backups (keep last 30 days)
            await self._cleanup_old_backups(days=30)
            
            logger.info(f"Backup completed: {s3_key}")
            
        finally:
            if os.path.exists(backup_file):
                os.remove(backup_file)
```

### 9. PII Detection & Security

```python
# src/security/pii_detector.py

from presidio_analyzer import AnalyzerEngine

class PIIDetector:
    """Detect and optionally redact PII from memories."""
    
    PII_TYPES = [
        "CREDIT_CARD",
        "EMAIL_ADDRESS",
        "PHONE_NUMBER",
        "US_SSN",
        "US_PASSPORT",
    ]
    
    def __init__(self):
        self.analyzer = AnalyzerEngine()
        
    async def scan(self, text: str) -> PIIResult:
        """Scan text for PII."""
        
        results = self.analyzer.analyze(
            text=text,
            entities=self.PII_TYPES,
            language='en'
        )
        
        return PIIResult(
            detected=len(results) > 0,
            pii_types=[r.entity_type for r in results],
            locations=[(r.start, r.end) for r in results]
        )
    
    async def process_memory(self, content: str) -> ProcessedMemory:
        """Process memory content for PII."""
        
        pii_result = await self.scan(content)
        
        if not pii_result.detected:
            return ProcessedMemory(content=content, pii_detected=[])
        
        # Flag PII but don't auto-redact (user decides)
        return ProcessedMemory(
            content=content,
            pii_detected=pii_result.pii_types,
            warning=f"PII detected: {', '.join(pii_result.pii_types)}"
        )
```

---

## Docker Compose Setup

```yaml
# docker-compose.yml

version: '3.8'

services:
  postgres:
    image: ankane/pgvector:latest
    environment:
      POSTGRES_DB: assistant
      POSTGRES_USER: assistant
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U assistant"]
      interval: 10s

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - ./data/redis:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s

  assistant:
    build: .
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      - POSTGRES_HOST=postgres
      - REDIS_HOST=redis
    volumes:
      - ./data/logs:/app/logs
      - ./obsidian_vault:/app/obsidian_vault
      - ./.env:/app/.env
    ports:
      - "8000:8000"
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    volumes:
      - ./data/grafana:/var/lib/grafana
    ports:
      - "3000:3000"
```

---

## Testing Strategy

### Unit Tests
```python
# tests/unit/test_router.py

async def test_router_classifies_simple():
    """Router routes simple queries to Haiku."""
    router = RouterAgent()
    
    simple_messages = ["hey", "thanks", "what's 2+2"]
    
    for msg in simple_messages:
        decision = await router.classify(msg)
        assert decision.target_agent == "haiku"
```

### Integration Tests
```python
# tests/integration/test_sms_flow.py

async def test_full_sms_conversation():
    """Test complete SMS conversation with memory."""
    
    response = await client.post(
        "/webhooks/sms",
        data={"From": USER_PHONE, "Body": "Tell me about Marci"}
    )
    
    assert response.status_code == 200
    assert "girlfriend" in response.text.lower()
```

### Performance Tests
```python
# tests/performance/test_retrieval_speed.py

async def test_retrieval_latency():
    """Retrieval should complete in <100ms."""
    
    start = time.time()
    results = await retrieval.retrieve(query="filmmaking", user_id="test")
    latency = time.time() - start
    
    assert latency < 0.1
```

---

## Build Order

**Phase 1: Infrastructure (2-3 hours)**
1. Docker Compose setup (PostgreSQL + Redis)
2. Database schema and migrations
3. Connection pooling
4. **TEST:** Database connectivity

**Phase 2: Memory Foundation (3-4 hours)**
1. Memory schemas (Pydantic models)
2. PostgreSQL wrapper with pgvector
3. Redis caching layer
4. Embedding generation with cache
5. **TEST:** CRUD with cache hits
6. Enhanced retrieval with re-ranking
7. **TEST:** Retrieval accuracy
8. Deduplication logic
9. **TEST:** Dedup merges correctly

**Phase 3: Router & Agents (3-4 hours)**
1. Router agent for classification
2. **TEST:** Router classifies correctly
3. Haiku agent for simple responses
4. Sonnet agent for complex reasoning
5. **TEST:** End-to-end routing flow
6. Judge agent with consolidation
7. **TEST:** Consolidation works
8. Tool executor framework
9. **TEST:** Tools execute

**Phase 4: User Controls (2 hours)**
1. Memory command parser
2. /remember, /forget, /search commands
3. **TEST:** Commands work
4. Correction detection
5. **TEST:** Corrections update memories

**Phase 5: Security & Monitoring (2-3 hours)**
1. PII detection with presidio
2. **TEST:** PII detected
3. Cost tracking system
4. **TEST:** Token usage recorded
5. Prometheus metrics
6. **TEST:** Metrics exported
7. Error handling and retries
8. **TEST:** Failures handled gracefully

**Phase 6: Communication (2 hours)**
1. FastAPI server
2. Twilio + Discord integrations
3. **TEST:** Full conversation flows
4. State manager
5. Scheduler
6. **TEST:** State transitions

**Phase 7: Backups & Obsidian (1-2 hours)**
1. Automated backup to S3
2. **TEST:** Backup completes
3. Obsidian sync with git
4. **TEST:** Markdown files generated

**Total: 15-20 hours with thorough testing**

---

## Cost Analysis

**Assumptions:** 50 messages/day at moderate usage

### Breakdown

**Router:** All messages
- 50 × 20 tokens × $0.25/1M = $0.00025/day
- **Monthly: ~$0.01**

**Simple Responses (80%):** Haiku
- 40 messages × 350 tokens × ~$0.5/1M avg = $0.01/day
- **Monthly: ~$0.29**

**Complex Responses (15%):** Sonnet
- 7.5 messages × 350 tokens × $7/1M avg = $0.02/day
- **Monthly: ~$0.64**

**Tool Usage (5%):** Sonnet + tools
- 2.5 messages × 500 tokens × $7/1M avg = $0.01/day
- **Monthly: ~$0.29**

**Memory & Judge:**
- Embeddings: $0.06/month
- Judge consolidation: $0.12/month
- Retrieval context: $0.45/month
- **Monthly: ~$0.63**

**Total: ~$1.87/month at 50 messages/day**

At 100 messages/day: ~$3.12/month
At 200 messages/day: ~$5.80/month

---

## Environment Configuration

See `.env.example` for complete configuration template.

**Key Variables:**
- `ROUTER_MODEL=claude-haiku-4-20250514`
- `SIMPLE_AGENT_MODEL=claude-haiku-4-20250514`
- `COMPLEX_AGENT_MODEL=claude-sonnet-4-20250514`
- `POSTGRES_HOST`, `POSTGRES_DB`, `POSTGRES_PASSWORD`
- `REDIS_HOST`, `REDIS_PORT`
- `S3_ENDPOINT`, `S3_BUCKET` (for backups)
- `TWILIO_*`, `DISCORD_*` (communication)

---

## Summary

This specification provides a complete, production-ready autonomous personal assistant that:

✅ **Saves 60-80% on costs** through intelligent routing
✅ **Never loses data** with automated backups
✅ **Gives user control** with memory commands
✅ **Stays clean** through automatic deduplication
✅ **Retrieves smartly** with importance-aware re-ranking
✅ **Protects privacy** with PII detection
✅ **Monitors itself** with cost tracking and metrics
✅ **Scales effortlessly** when ready to add users
✅ **Recovers gracefully** from errors and failures
✅ **Learns from corrections** instead of accumulating contradictions

**Architecture:** Multi-agent with intelligent routing
**Database:** PostgreSQL + pgvector + Redis
**Cost:** $1-2/month at moderate usage
**Deployment:** Docker Compose ready
**Testing:** Unit + Integration + Performance
**Security:** PII detection + encryption + rate limiting

Build it phase by phase, test thoroughly, and you'll have a personal assistant that actually works in daily life.
