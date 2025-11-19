"""
Configuration management for the autonomous assistant.

Uses Pydantic Settings for type-safe environment variable loading.
"""

from typing import List, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # =========================================================================
    # API Keys
    # =========================================================================

    anthropic_api_key: str = Field(..., description="Anthropic API key")
    openai_api_key: str = Field(..., description="OpenAI API key")

    # Model selection
    router_model: str = Field(
        default="claude-haiku-4-20250514",
        description="Model for message routing",
    )
    simple_agent_model: str = Field(
        default="claude-haiku-4-20250514",
        description="Model for simple queries",
    )
    complex_agent_model: str = Field(
        default="claude-sonnet-4-20250514",
        description="Model for complex queries",
    )
    judge_model: str = Field(
        default="gpt-4o-mini-2024-07-18",
        description="Model for memory consolidation",
    )
    embedding_model: str = Field(
        default="text-embedding-3-small",
        description="Model for embeddings",
    )

    # =========================================================================
    # Database - PostgreSQL
    # =========================================================================

    postgres_host: str = Field(default="localhost")
    postgres_port: int = Field(default=5432)
    postgres_db: str = Field(default="assistant")
    postgres_user: str = Field(default="assistant")
    postgres_password: str = Field(...)

    # Connection pool
    postgres_min_pool_size: int = Field(default=5)
    postgres_max_pool_size: int = Field(default=20)

    @property
    def postgres_url(self) -> str:
        """Get PostgreSQL connection URL."""
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def postgres_async_url(self) -> str:
        """Get async PostgreSQL connection URL."""
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # =========================================================================
    # Cache - Redis
    # =========================================================================

    redis_host: str = Field(default="localhost")
    redis_port: int = Field(default=6379)
    redis_password: Optional[str] = Field(default=None)
    redis_db: int = Field(default=0)

    # Cache TTLs (seconds)
    embedding_cache_ttl: int = Field(default=3600)
    memory_cache_ttl: int = Field(default=1800)
    route_cache_ttl: int = Field(default=3600)

    @property
    def redis_url(self) -> str:
        """Get Redis connection URL."""
        if self.redis_password:
            return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/{self.redis_db}"
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"

    # =========================================================================
    # Twilio - SMS Integration
    # =========================================================================

    twilio_account_sid: Optional[str] = Field(default=None)
    twilio_auth_token: Optional[str] = Field(default=None)
    twilio_phone_number: Optional[str] = Field(default=None)
    user_phone_number: Optional[str] = Field(default=None)

    # =========================================================================
    # Discord - Bot Integration
    # =========================================================================

    discord_bot_token: Optional[str] = Field(default=None)
    discord_user_id: Optional[str] = Field(default=None)
    discord_notification_channel_id: Optional[str] = Field(default=None)

    # =========================================================================
    # Memory System Configuration
    # =========================================================================

    # Retrieval
    initial_retrieval_k: int = Field(default=20)
    final_retrieval_k: int = Field(default=5)
    min_retrieval_importance: float = Field(default=5.0)

    # Consolidation
    consolidation_interval_minutes: int = Field(default=120)
    min_idle_time_seconds: int = Field(default=300)
    pruning_schedule_hour: int = Field(default=3, ge=0, le=23)

    # Deduplication
    similarity_threshold: float = Field(default=0.92, ge=0.0, le=1.0)
    merge_threshold: float = Field(default=0.85, ge=0.0, le=1.0)
    run_deduplication: bool = Field(default=True)

    # Limits
    max_memories_per_user: int = Field(default=10000)
    memory_pruning_enabled: bool = Field(default=True)
    prune_importance_threshold: float = Field(default=3.0)
    prune_days_inactive: int = Field(default=30)

    # =========================================================================
    # Backups - S3-Compatible Storage
    # =========================================================================

    s3_endpoint: Optional[str] = Field(default=None)
    s3_access_key: Optional[str] = Field(default=None)
    s3_secret_key: Optional[str] = Field(default=None)
    s3_bucket: Optional[str] = Field(default=None)
    s3_region: str = Field(default="us-west-000")

    backup_enabled: bool = Field(default=False)
    backup_schedule_hour: int = Field(default=3, ge=0, le=23)
    backup_retention_days: int = Field(default=30)

    # =========================================================================
    # Security
    # =========================================================================

    # PII Detection
    pii_detection_enabled: bool = Field(default=True)
    pii_auto_redact: bool = Field(default=False)
    pii_types_to_detect: str = Field(
        default="CREDIT_CARD,US_SSN,PHONE_NUMBER,EMAIL_ADDRESS"
    )

    @property
    def pii_types_list(self) -> List[str]:
        """Get PII types as a list."""
        return [t.strip() for t in self.pii_types_to_detect.split(",")]

    # Encryption
    encryption_enabled: bool = Field(default=False)
    encryption_key: Optional[str] = Field(default=None)

    # Rate limiting
    rate_limit_enabled: bool = Field(default=True)
    sms_rate_limit_per_hour: int = Field(default=20)
    discord_rate_limit_per_minute: int = Field(default=10)
    api_rate_limit_per_minute: int = Field(default=60)

    # =========================================================================
    # Monitoring
    # =========================================================================

    # Sentry
    sentry_dsn: Optional[str] = Field(default=None)
    sentry_environment: str = Field(default="production")

    # Prometheus
    prometheus_enabled: bool = Field(default=True)
    prometheus_port: int = Field(default=8001)

    # Cost tracking
    cost_tracking_enabled: bool = Field(default=True)
    daily_budget_usd: float = Field(default=5.0)
    warn_at_percent: int = Field(default=80)

    # =========================================================================
    # Obsidian - Git-Based Sync
    # =========================================================================

    obsidian_vault_path: str = Field(default="./obsidian_vault")
    obsidian_git_remote: Optional[str] = Field(default=None)
    obsidian_git_branch: str = Field(default="main")
    obsidian_sync_enabled: bool = Field(default=False)
    obsidian_notify_on_sync: bool = Field(default=True)

    # =========================================================================
    # System
    # =========================================================================

    log_level: str = Field(default="INFO")
    debug_mode: bool = Field(default=False)

    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)
    base_url: str = Field(default="http://localhost:8000")

    worker_threads: int = Field(default=4)
    max_concurrent_requests: int = Field(default=10)

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        """Validate log level."""
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        v_upper = v.upper()
        if v_upper not in valid_levels:
            raise ValueError(f"Invalid log level. Must be one of: {valid_levels}")
        return v_upper


# Create global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get application settings."""
    return settings
