"""
PostgreSQL database connection with asyncpg.

Provides connection pooling and transaction management.
"""

import asyncpg
from typing import Any, Dict, List, Optional

from src.utils.config import get_settings
from src.utils.logging import get_logger
from src.utils.retry import retry_on_network_error

settings = get_settings()
logger = get_logger(__name__)


class Database:
    """PostgreSQL database connection manager."""

    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None

    @retry_on_network_error(max_retries=3, initial_delay=1.0)
    async def connect(self) -> None:
        """Create connection pool to PostgreSQL."""
        if self.pool is not None:
            logger.warning("Database pool already exists")
            return

        logger.info(
            "Connecting to PostgreSQL",
            extra={
                "host": settings.postgres_host,
                "port": settings.postgres_port,
                "database": settings.postgres_db,
            },
        )

        try:
            self.pool = await asyncpg.create_pool(
                host=settings.postgres_host,
                port=settings.postgres_port,
                database=settings.postgres_db,
                user=settings.postgres_user,
                password=settings.postgres_password,
                min_size=settings.postgres_min_pool_size,
                max_size=settings.postgres_max_pool_size,
                command_timeout=60,
            )

            # Test connection
            async with self.pool.acquire() as conn:
                version = await conn.fetchval("SELECT version()")
                logger.info(f"Connected to PostgreSQL: {version}")

        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL: {e}")
            raise

    async def disconnect(self) -> None:
        """Close connection pool."""
        if self.pool is None:
            return

        logger.info("Disconnecting from PostgreSQL")
        await self.pool.close()
        self.pool = None

    async def execute(
        self,
        query: str,
        *args: Any,
    ) -> str:
        """
        Execute a query that doesn't return results (INSERT, UPDATE, DELETE).

        Args:
            query: SQL query
            *args: Query parameters

        Returns:
            Status message
        """
        if self.pool is None:
            raise RuntimeError("Database not connected")

        async with self.pool.acquire() as conn:
            result = await conn.execute(query, *args)
            return result

    async def fetch(
        self,
        query: str,
        *args: Any,
    ) -> List[asyncpg.Record]:
        """
        Execute a query and fetch all results.

        Args:
            query: SQL query
            *args: Query parameters

        Returns:
            List of records
        """
        if self.pool is None:
            raise RuntimeError("Database not connected")

        async with self.pool.acquire() as conn:
            return await conn.fetch(query, *args)

    async def fetchone(
        self,
        query: str,
        *args: Any,
    ) -> Optional[asyncpg.Record]:
        """
        Execute a query and fetch one result.

        Args:
            query: SQL query
            *args: Query parameters

        Returns:
            Single record or None
        """
        if self.pool is None:
            raise RuntimeError("Database not connected")

        async with self.pool.acquire() as conn:
            return await conn.fetchrow(query, *args)

    async def fetchval(
        self,
        query: str,
        *args: Any,
        column: int = 0,
    ) -> Any:
        """
        Execute a query and fetch a single value.

        Args:
            query: SQL query
            *args: Query parameters
            column: Column index to fetch

        Returns:
            Single value
        """
        if self.pool is None:
            raise RuntimeError("Database not connected")

        async with self.pool.acquire() as conn:
            return await conn.fetchval(query, *args, column=column)

    async def transaction(self):
        """
        Get a transaction context manager.

        Example:
            async with db.transaction() as conn:
                await conn.execute("INSERT INTO ...")
                await conn.execute("UPDATE ...")
        """
        if self.pool is None:
            raise RuntimeError("Database not connected")

        connection = await self.pool.acquire()
        transaction = connection.transaction()

        class TransactionContext:
            def __init__(self, conn, trans, pool):
                self.conn = conn
                self.trans = trans
                self.pool = pool

            async def __aenter__(self):
                await self.trans.start()
                return self.conn

            async def __aexit__(self, exc_type, exc_val, exc_tb):
                try:
                    if exc_type is None:
                        await self.trans.commit()
                    else:
                        await self.trans.rollback()
                finally:
                    await self.pool.release(self.conn)

        return TransactionContext(connection, transaction, self.pool)


# Global database instance
_db: Optional[Database] = None


def get_database() -> Database:
    """
    Get global database instance.

    Returns:
        Database instance
    """
    global _db
    if _db is None:
        _db = Database()
    return _db


async def init_database() -> Database:
    """
    Initialize and connect to database.

    Returns:
        Connected database instance
    """
    db = get_database()
    await db.connect()
    return db


async def close_database() -> None:
    """Close database connection."""
    global _db
    if _db is not None:
        await _db.disconnect()
        _db = None
