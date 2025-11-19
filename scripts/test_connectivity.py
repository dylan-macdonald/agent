#!/usr/bin/env python3
"""
Test database and cache connectivity.

Run this script to verify that PostgreSQL and Redis are properly configured.
"""

import asyncio
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.memory.cache import init_cache, close_cache
from src.memory.database import init_database, close_database
from src.utils.logging import get_logger

logger = get_logger(__name__)


async def test_postgres():
    """Test PostgreSQL connection and schema."""
    logger.info("=" * 60)
    logger.info("Testing PostgreSQL Connection")
    logger.info("=" * 60)

    try:
        db = await init_database()
        logger.info("✓ Connected to PostgreSQL")

        # Check extensions
        extensions = await db.fetch(
            "SELECT extname FROM pg_extension WHERE extname IN ('vector', 'pgcrypto')"
        )
        ext_names = [row["extname"] for row in extensions]

        if "vector" in ext_names:
            logger.info("✓ pgvector extension installed")
        else:
            logger.warning("✗ pgvector extension NOT found")

        if "pgcrypto" in ext_names:
            logger.info("✓ pgcrypto extension installed")
        else:
            logger.warning("✗ pgcrypto extension NOT found")

        # Check tables
        tables = await db.fetch(
            """
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY tablename
            """
        )
        table_names = [row["tablename"] for row in tables]

        expected_tables = [
            "users",
            "memories",
            "token_usage",
            "conversations",
            "backups",
            "system_state",
        ]

        logger.info(f"\nFound {len(table_names)} tables:")
        for table in table_names:
            status = "✓" if table in expected_tables else "?"
            logger.info(f"  {status} {table}")

        missing_tables = set(expected_tables) - set(table_names)
        if missing_tables:
            logger.warning(f"\nMissing tables: {', '.join(missing_tables)}")
        else:
            logger.info("\n✓ All expected tables present")

        # Test insert and query
        logger.info("\nTesting database operations...")

        # Insert test user
        user_id = await db.fetchval(
            """
            INSERT INTO users (phone_number, settings)
            VALUES ($1, $2)
            RETURNING id
            """,
            "+1234567890",
            {"test": True},
        )
        logger.info(f"✓ Inserted test user: {user_id}")

        # Query test user
        user = await db.fetchone(
            "SELECT * FROM users WHERE id = $1", user_id
        )
        if user:
            logger.info(f"✓ Retrieved test user: {user['phone_number']}")

        # Delete test user
        await db.execute("DELETE FROM users WHERE id = $1", user_id)
        logger.info("✓ Deleted test user")

        logger.info("\n✓ PostgreSQL is working correctly!")
        return True

    except Exception as e:
        logger.error(f"✗ PostgreSQL test failed: {e}", exc_info=True)
        return False
    finally:
        await close_database()


async def test_redis():
    """Test Redis connection and operations."""
    logger.info("\n" + "=" * 60)
    logger.info("Testing Redis Connection")
    logger.info("=" * 60)

    try:
        cache = await init_cache()
        logger.info("✓ Connected to Redis")

        # Test basic operations
        test_key = "test:connectivity"
        test_value = "Hello, Redis!"

        # Set
        await cache.set(test_key, test_value, ttl=60)
        logger.info("✓ SET operation successful")

        # Get
        retrieved = await cache.get(test_key)
        if retrieved == test_value:
            logger.info("✓ GET operation successful")
        else:
            logger.warning(f"✗ GET mismatch: expected '{test_value}', got '{retrieved}'")

        # Exists
        exists = await cache.exists(test_key)
        if exists:
            logger.info("✓ EXISTS operation successful")

        # JSON operations
        test_json = {"message": "Hello", "number": 42, "nested": {"key": "value"}}
        await cache.set_json("test:json", test_json, ttl=60)
        retrieved_json = await cache.get_json("test:json")
        if retrieved_json == test_json:
            logger.info("✓ JSON operations successful")

        # Increment
        await cache.set("test:counter", "0")
        count = await cache.increment("test:counter", 5)
        if count == 5:
            logger.info("✓ INCREMENT operation successful")

        # Delete
        await cache.delete(test_key)
        await cache.delete("test:json")
        await cache.delete("test:counter")
        logger.info("✓ DELETE operation successful")

        logger.info("\n✓ Redis is working correctly!")
        return True

    except Exception as e:
        logger.error(f"✗ Redis test failed: {e}", exc_info=True)
        return False
    finally:
        await close_cache()


async def main():
    """Run all connectivity tests."""
    logger.info("Starting connectivity tests...\n")

    postgres_ok = await test_postgres()
    redis_ok = await test_redis()

    logger.info("\n" + "=" * 60)
    logger.info("SUMMARY")
    logger.info("=" * 60)
    logger.info(f"PostgreSQL: {'✓ PASS' if postgres_ok else '✗ FAIL'}")
    logger.info(f"Redis:      {'✓ PASS' if redis_ok else '✗ FAIL'}")

    if postgres_ok and redis_ok:
        logger.info("\n✓ All tests passed! Infrastructure is ready.")
        return 0
    else:
        logger.error("\n✗ Some tests failed. Check logs above for details.")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
