-- ============================================================================
-- Autonomous Personal Assistant - Initial Database Schema
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) UNIQUE,
    discord_id VARCHAR(50) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    settings JSONB DEFAULT '{}'::jsonb,

    -- Ensure at least one contact method
    CONSTRAINT user_contact_check CHECK (
        phone_number IS NOT NULL OR discord_id IS NOT NULL
    )
);

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_discord ON users(discord_id);

-- ============================================================================
-- MEMORIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536),  -- text-embedding-3-small dimension

    -- Importance scoring
    base_importance FLOAT DEFAULT 5.0 CHECK (base_importance >= 0.0 AND base_importance <= 10.0),
    access_boost FLOAT DEFAULT 0.0,
    recency_factor FLOAT DEFAULT 1.0,
    user_override_importance FLOAT CHECK (user_override_importance IS NULL OR
                                          (user_override_importance >= 0.0 AND user_override_importance <= 10.0)),

    -- Decay configuration
    decay_rate FLOAT DEFAULT 0.1 CHECK (decay_rate >= 0.0 AND decay_rate <= 1.0),
    half_life_days INT DEFAULT 30 CHECK (half_life_days > 0),
    minimum_importance FLOAT DEFAULT 2.0 CHECK (minimum_importance >= 0.0),

    -- Deduplication
    cluster_id UUID,
    similar_memory_ids UUID[],
    merged_count INT DEFAULT 1 CHECK (merged_count >= 1),

    -- Access patterns
    access_count INT DEFAULT 0 CHECK (access_count >= 0),
    last_accessed TIMESTAMP,
    access_frequency FLOAT DEFAULT 0.0 CHECK (access_frequency >= 0.0),
    retrieval_success_rate FLOAT DEFAULT 0.0 CHECK (retrieval_success_rate >= 0.0 AND retrieval_success_rate <= 1.0),

    -- Metadata
    topics TEXT[],
    entities JSONB DEFAULT '[]'::jsonb,
    sentiment FLOAT CHECK (sentiment IS NULL OR (sentiment >= -1.0 AND sentiment <= 1.0)),
    memory_type VARCHAR(50) DEFAULT 'episodic' CHECK (memory_type IN ('episodic', 'semantic', 'procedural')),
    source VARCHAR(50) CHECK (source IN ('conversation', 'user_explicit', 'consolidation')),
    pii_detected TEXT[],

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Memory indexes for performance
CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(base_importance);
CREATE INDEX IF NOT EXISTS idx_memories_accessed ON memories(last_accessed);
CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at);
CREATE INDEX IF NOT EXISTS idx_memories_topics ON memories USING GIN(topics);
CREATE INDEX IF NOT EXISTS idx_memories_entities ON memories USING GIN(entities);
CREATE INDEX IF NOT EXISTS idx_memories_cluster ON memories(cluster_id) WHERE cluster_id IS NOT NULL;

-- Vector similarity search index (HNSW for speed)
CREATE INDEX IF NOT EXISTS idx_memories_embedding ON memories
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ============================================================================
-- TOKEN USAGE TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_usage (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    model VARCHAR(100) NOT NULL,
    operation VARCHAR(100) NOT NULL,
    input_tokens INT NOT NULL CHECK (input_tokens >= 0),
    output_tokens INT NOT NULL CHECK (output_tokens >= 0),
    cost DECIMAL(10, 6) NOT NULL CHECK (cost >= 0),
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Token usage indexes
CREATE INDEX IF NOT EXISTS idx_token_usage_user_date ON token_usage(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_token_usage_model ON token_usage(model);
CREATE INDEX IF NOT EXISTS idx_token_usage_timestamp ON token_usage(timestamp);

-- ============================================================================
-- CONVERSATION HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_id VARCHAR(255) UNIQUE,  -- External message ID (SMS/Discord)
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,

    -- Routing information
    route_classification VARCHAR(20) CHECK (route_classification IN ('SIMPLE', 'COMPLEX', 'TOOL')),
    agent_used VARCHAR(50),  -- haiku, sonnet, etc.

    -- Metadata
    channel VARCHAR(20) CHECK (channel IN ('sms', 'discord', 'api')),
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Processing
    consolidated BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW()
);

-- Conversation indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_consolidated ON conversations(consolidated) WHERE NOT consolidated;
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel);

-- ============================================================================
-- BACKUPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS backups (
    id SERIAL PRIMARY KEY,
    backup_type VARCHAR(20) NOT NULL CHECK (backup_type IN ('full', 'incremental')),
    file_path TEXT NOT NULL,
    size_bytes BIGINT CHECK (size_bytes >= 0),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    error_message TEXT,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Backup indexes
CREATE INDEX IF NOT EXISTS idx_backups_status ON backups(status);
CREATE INDEX IF NOT EXISTS idx_backups_completed ON backups(completed_at);

-- ============================================================================
-- SYSTEM STATE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_state (
    id SERIAL PRIMARY KEY,
    state VARCHAR(50) NOT NULL CHECK (state IN ('idle', 'active', 'consolidating', 'backing_up', 'error')),
    last_message_time TIMESTAMP,
    last_consolidation_time TIMESTAMP,
    last_backup_time TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert initial state
INSERT INTO system_state (state, updated_at)
VALUES ('idle', NOW())
ON CONFLICT DO NOTHING;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memories_updated_at BEFORE UPDATE ON memories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate composite memory score
CREATE OR REPLACE FUNCTION calculate_memory_score(
    p_embedding vector(1536),
    p_query_embedding vector(1536),
    p_base_importance FLOAT,
    p_created_at TIMESTAMP,
    p_access_frequency FLOAT,
    p_user_override FLOAT
) RETURNS FLOAT AS $$
DECLARE
    v_relevance FLOAT;
    v_importance FLOAT;
    v_recency FLOAT;
    v_access FLOAT;
    v_days_old FLOAT;
    v_composite FLOAT;
BEGIN
    -- Cosine similarity for relevance
    v_relevance := 1 - (p_embedding <=> p_query_embedding);

    -- Normalize importance
    v_importance := p_base_importance / 10.0;

    -- Recency score (exponential decay with 30-day half-life)
    v_days_old := EXTRACT(EPOCH FROM (NOW() - p_created_at)) / 86400.0;
    v_recency := EXP(-v_days_old / 30.0);

    -- Access score (capped at 1.0)
    v_access := LEAST(p_access_frequency, 1.0);

    -- Weighted composite
    v_composite := (
        v_relevance * 0.4 +
        v_importance * 0.3 +
        v_recency * 0.2 +
        v_access * 0.1
    );

    -- Boost if user explicitly flagged as important
    IF p_user_override IS NOT NULL THEN
        v_composite := v_composite * 1.2;
    END IF;

    RETURN v_composite;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for active memories (not decayed too much)
CREATE OR REPLACE VIEW active_memories AS
SELECT
    m.*,
    calculate_memory_score(
        m.embedding,
        m.embedding,  -- Self-comparison for sorting
        m.base_importance,
        m.created_at,
        m.access_frequency,
        m.user_override_importance
    ) AS composite_score
FROM memories m
WHERE m.base_importance >= m.minimum_importance;

-- View for daily cost summary
CREATE OR REPLACE VIEW daily_cost_summary AS
SELECT
    DATE(timestamp) AS date,
    user_id,
    model,
    SUM(input_tokens) AS total_input_tokens,
    SUM(output_tokens) AS total_output_tokens,
    SUM(cost) AS total_cost,
    COUNT(*) AS operation_count
FROM token_usage
GROUP BY DATE(timestamp), user_id, model
ORDER BY date DESC, total_cost DESC;

-- ============================================================================
-- GRANTS (for application user)
-- ============================================================================

-- Note: In production, create a separate app user with limited permissions
-- For development, the assistant user has full access

-- ============================================================================
-- COMPLETE
-- ============================================================================

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Database schema initialized successfully';
    RAISE NOTICE 'Extensions: vector, pgcrypto';
    RAISE NOTICE 'Tables: users, memories, token_usage, conversations, backups, system_state';
    RAISE NOTICE 'Ready for autonomous assistant operations';
END $$;
