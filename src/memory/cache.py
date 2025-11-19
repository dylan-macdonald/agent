"""
Redis cache connection and utilities.

Provides caching layer for embeddings, routing decisions, and hot memories.
"""

import json
from typing import Any, Optional

import redis.asyncio as redis
from redis.asyncio import Redis

from src.utils.config import get_settings
from src.utils.logging import get_logger
from src.utils.retry import retry_on_network_error

settings = get_settings()
logger = get_logger(__name__)


class Cache:
    """Redis cache manager."""

    def __init__(self):
        self.client: Optional[Redis] = None

    @retry_on_network_error(max_retries=3, initial_delay=1.0)
    async def connect(self) -> None:
        """Connect to Redis."""
        if self.client is not None:
            logger.warning("Redis client already exists")
            return

        logger.info(
            "Connecting to Redis",
            extra={
                "host": settings.redis_host,
                "port": settings.redis_port,
                "db": settings.redis_db,
            },
        )

        try:
            self.client = await redis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
            )

            # Test connection
            await self.client.ping()
            info = await self.client.info("server")
            redis_version = info.get("redis_version", "unknown")
            logger.info(f"Connected to Redis: version {redis_version}")

        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise

    async def disconnect(self) -> None:
        """Close Redis connection."""
        if self.client is None:
            return

        logger.info("Disconnecting from Redis")
        await self.client.close()
        self.client = None

    async def get(self, key: str) -> Optional[str]:
        """
        Get value from cache.

        Args:
            key: Cache key

        Returns:
            Cached value or None
        """
        if self.client is None:
            raise RuntimeError("Cache not connected")

        try:
            return await self.client.get(key)
        except Exception as e:
            logger.error(f"Cache GET failed for key {key}: {e}")
            return None

    async def set(
        self,
        key: str,
        value: str,
        ttl: Optional[int] = None,
    ) -> bool:
        """
        Set value in cache.

        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds

        Returns:
            True if successful
        """
        if self.client is None:
            raise RuntimeError("Cache not connected")

        try:
            if ttl:
                await self.client.setex(key, ttl, value)
            else:
                await self.client.set(key, value)
            return True
        except Exception as e:
            logger.error(f"Cache SET failed for key {key}: {e}")
            return False

    async def delete(self, key: str) -> bool:
        """
        Delete value from cache.

        Args:
            key: Cache key

        Returns:
            True if deleted
        """
        if self.client is None:
            raise RuntimeError("Cache not connected")

        try:
            result = await self.client.delete(key)
            return result > 0
        except Exception as e:
            logger.error(f"Cache DELETE failed for key {key}: {e}")
            return False

    async def exists(self, key: str) -> bool:
        """
        Check if key exists in cache.

        Args:
            key: Cache key

        Returns:
            True if exists
        """
        if self.client is None:
            raise RuntimeError("Cache not connected")

        try:
            return await self.client.exists(key) > 0
        except Exception as e:
            logger.error(f"Cache EXISTS failed for key {key}: {e}")
            return False

    async def get_json(self, key: str) -> Optional[Any]:
        """
        Get JSON value from cache.

        Args:
            key: Cache key

        Returns:
            Parsed JSON or None
        """
        value = await self.get(key)
        if value is None:
            return None

        try:
            return json.loads(value)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON for key {key}: {e}")
            return None

    async def set_json(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
    ) -> bool:
        """
        Set JSON value in cache.

        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            ttl: Time to live in seconds

        Returns:
            True if successful
        """
        try:
            json_value = json.dumps(value)
            return await self.set(key, json_value, ttl)
        except (TypeError, ValueError) as e:
            logger.error(f"Failed to serialize JSON for key {key}: {e}")
            return False

    async def increment(self, key: str, amount: int = 1) -> int:
        """
        Increment a counter.

        Args:
            key: Cache key
            amount: Amount to increment by

        Returns:
            New value
        """
        if self.client is None:
            raise RuntimeError("Cache not connected")

        try:
            return await self.client.incrby(key, amount)
        except Exception as e:
            logger.error(f"Cache INCREMENT failed for key {key}: {e}")
            return 0

    async def expire(self, key: str, ttl: int) -> bool:
        """
        Set expiration on a key.

        Args:
            key: Cache key
            ttl: Time to live in seconds

        Returns:
            True if successful
        """
        if self.client is None:
            raise RuntimeError("Cache not connected")

        try:
            return await self.client.expire(key, ttl)
        except Exception as e:
            logger.error(f"Cache EXPIRE failed for key {key}: {e}")
            return False

    async def keys(self, pattern: str = "*") -> list:
        """
        Get all keys matching pattern.

        Args:
            pattern: Key pattern (supports wildcards)

        Returns:
            List of matching keys
        """
        if self.client is None:
            raise RuntimeError("Cache not connected")

        try:
            return await self.client.keys(pattern)
        except Exception as e:
            logger.error(f"Cache KEYS failed for pattern {pattern}: {e}")
            return []

    async def flush(self) -> bool:
        """
        Flush all keys from current database.

        WARNING: This deletes all cached data.

        Returns:
            True if successful
        """
        if self.client is None:
            raise RuntimeError("Cache not connected")

        logger.warning("Flushing Redis cache")
        try:
            await self.client.flushdb()
            return True
        except Exception as e:
            logger.error(f"Cache FLUSH failed: {e}")
            return False


# Global cache instance
_cache: Optional[Cache] = None


def get_cache() -> Cache:
    """
    Get global cache instance.

    Returns:
        Cache instance
    """
    global _cache
    if _cache is None:
        _cache = Cache()
    return _cache


async def init_cache() -> Cache:
    """
    Initialize and connect to cache.

    Returns:
        Connected cache instance
    """
    cache = get_cache()
    await cache.connect()
    return cache


async def close_cache() -> None:
    """Close cache connection."""
    global _cache
    if _cache is not None:
        await _cache.disconnect()
        _cache = None
