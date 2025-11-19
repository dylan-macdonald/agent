"""
Retry logic with exponential backoff for the autonomous assistant.
"""

import asyncio
import functools
import random
from typing import Any, Callable, Optional, Tuple, Type

from src.utils.logging import get_logger

logger = get_logger(__name__)


class RetryError(Exception):
    """Raised when all retry attempts are exhausted."""

    pass


def retry_with_backoff(
    max_retries: int = 3,
    initial_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    jitter: bool = True,
    exceptions: Tuple[Type[Exception], ...] = (Exception,),
) -> Callable:
    """
    Decorator for retrying a function with exponential backoff.

    Args:
        max_retries: Maximum number of retry attempts
        initial_delay: Initial delay in seconds
        max_delay: Maximum delay in seconds
        exponential_base: Base for exponential backoff
        jitter: Whether to add random jitter to delays
        exceptions: Tuple of exceptions to catch and retry

    Returns:
        Decorated function

    Example:
        >>> @retry_with_backoff(max_retries=3, initial_delay=1.0)
        >>> async def fetch_data():
        >>>     # May fail and retry up to 3 times
        >>>     return await api.get_data()
    """

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
            last_exception: Optional[Exception] = None

            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)

                except exceptions as e:
                    last_exception = e

                    if attempt >= max_retries:
                        logger.error(
                            f"Function {func.__name__} failed after {max_retries} retries",
                            extra={"error": str(e), "attempts": attempt + 1},
                        )
                        raise RetryError(
                            f"Failed after {max_retries} retries: {str(e)}"
                        ) from e

                    # Calculate delay with exponential backoff
                    delay = min(
                        initial_delay * (exponential_base**attempt),
                        max_delay,
                    )

                    # Add jitter if enabled
                    if jitter:
                        delay = delay * (0.5 + random.random())

                    logger.warning(
                        f"Function {func.__name__} failed, retrying in {delay:.2f}s",
                        extra={
                            "error": str(e),
                            "attempt": attempt + 1,
                            "max_retries": max_retries,
                            "delay": delay,
                        },
                    )

                    await asyncio.sleep(delay)

            # This should never be reached, but just in case
            if last_exception:
                raise last_exception
            raise RetryError("Retry logic failed unexpectedly")

        @functools.wraps(func)
        def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
            last_exception: Optional[Exception] = None

            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)

                except exceptions as e:
                    last_exception = e

                    if attempt >= max_retries:
                        logger.error(
                            f"Function {func.__name__} failed after {max_retries} retries",
                            extra={"error": str(e), "attempts": attempt + 1},
                        )
                        raise RetryError(
                            f"Failed after {max_retries} retries: {str(e)}"
                        ) from e

                    # Calculate delay with exponential backoff
                    delay = min(
                        initial_delay * (exponential_base**attempt),
                        max_delay,
                    )

                    # Add jitter if enabled
                    if jitter:
                        delay = delay * (0.5 + random.random())

                    logger.warning(
                        f"Function {func.__name__} failed, retrying in {delay:.2f}s",
                        extra={
                            "error": str(e),
                            "attempt": attempt + 1,
                            "max_retries": max_retries,
                            "delay": delay,
                        },
                    )

                    import time

                    time.sleep(delay)

            # This should never be reached, but just in case
            if last_exception:
                raise last_exception
            raise RetryError("Retry logic failed unexpectedly")

        # Return appropriate wrapper based on function type
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator


# Convenience decorators for common retry patterns

def retry_on_network_error(max_retries: int = 4, initial_delay: float = 2.0) -> Callable:
    """
    Retry on network-related errors (connection, timeout, etc.).

    Used for API calls, database connections, etc.
    """
    import httpx
    from asyncpg.exceptions import PostgresConnectionError
    from redis.exceptions import ConnectionError as RedisConnectionError

    return retry_with_backoff(
        max_retries=max_retries,
        initial_delay=initial_delay,
        exceptions=(
            ConnectionError,
            TimeoutError,
            PostgresConnectionError,
            RedisConnectionError,
            httpx.ConnectError,
            httpx.TimeoutException,
        ),
    )


def retry_on_rate_limit(max_retries: int = 3, initial_delay: float = 5.0) -> Callable:
    """
    Retry on rate limit errors.

    Used for API calls with rate limits (Anthropic, OpenAI, etc.).
    """
    from anthropic import RateLimitError as AnthropicRateLimitError
    from openai import RateLimitError as OpenAIRateLimitError

    return retry_with_backoff(
        max_retries=max_retries,
        initial_delay=initial_delay,
        exponential_base=3.0,  # Longer backoff for rate limits
        exceptions=(
            AnthropicRateLimitError,
            OpenAIRateLimitError,
        ),
    )
