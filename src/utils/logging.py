"""
Structured logging for the autonomous assistant.

Provides consistent, contextual logging across all modules.
"""

import logging
import sys
from pathlib import Path
from typing import Any, Dict, Optional

from src.utils.config import get_settings

settings = get_settings()


class StructuredFormatter(logging.Formatter):
    """Custom formatter that adds structured context to log messages."""

    def __init__(self, *args: Any, **kwargs: Any):
        super().__init__(*args, **kwargs)
        self.default_context: Dict[str, Any] = {}

    def format(self, record: logging.LogRecord) -> str:
        """Format log record with structured context."""
        # Add structured context if available
        context = getattr(record, "context", {})
        if context:
            context_str = " ".join([f"{k}={v}" for k, v in context.items()])
            record.msg = f"{record.msg} [{context_str}]"

        return super().format(record)


class ContextLogger(logging.LoggerAdapter):
    """Logger adapter that adds contextual information to all log messages."""

    def process(self, msg: str, kwargs: Any) -> tuple[str, Any]:
        """Add context to log message."""
        # Merge extra context from both the adapter and the call
        extra = kwargs.get("extra", {})
        context = {**self.extra, **extra}

        kwargs["extra"] = {"context": context}
        return msg, kwargs


def setup_logging() -> None:
    """Set up application logging."""
    # Create logs directory if it doesn't exist
    log_dir = Path("data/logs")
    log_dir.mkdir(parents=True, exist_ok=True)

    # Root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(settings.log_level)

    # Remove existing handlers
    root_logger.handlers.clear()

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(settings.log_level)

    # Console format (more readable for development)
    if settings.debug_mode:
        console_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    else:
        console_format = "%(levelname)s: %(message)s"

    console_formatter = StructuredFormatter(console_format)
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)

    # File handler (detailed logs)
    file_handler = logging.FileHandler(log_dir / "assistant.log")
    file_handler.setLevel(logging.DEBUG)  # Always log everything to file
    file_format = "%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s"
    file_formatter = StructuredFormatter(file_format)
    file_handler.setFormatter(file_formatter)
    root_logger.addHandler(file_handler)

    # Error file handler (errors only)
    error_handler = logging.FileHandler(log_dir / "errors.log")
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(file_formatter)
    root_logger.addHandler(error_handler)

    # Reduce noise from external libraries
    logging.getLogger("anthropic").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("asyncpg").setLevel(logging.WARNING)
    logging.getLogger("discord").setLevel(logging.INFO)
    logging.getLogger("twilio").setLevel(logging.INFO)


def get_logger(name: str, **context: Any) -> ContextLogger:
    """
    Get a logger with optional context.

    Args:
        name: Logger name (typically __name__)
        **context: Additional context to add to all log messages

    Returns:
        ContextLogger instance

    Example:
        >>> logger = get_logger(__name__, user_id="123", module="router")
        >>> logger.info("Processing message")
        INFO: Processing message [user_id=123 module=router]
    """
    logger = logging.getLogger(name)
    return ContextLogger(logger, context)


def log_function_call(
    logger: logging.Logger,
    function_name: str,
    **kwargs: Any,
) -> None:
    """
    Log a function call with parameters.

    Args:
        logger: Logger instance
        function_name: Name of the function
        **kwargs: Function parameters to log
    """
    params = ", ".join([f"{k}={v}" for k, v in kwargs.items()])
    logger.debug(f"Calling {function_name}({params})")


def log_error(
    logger: logging.Logger,
    error: Exception,
    context: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Log an error with context.

    Args:
        logger: Logger instance
        error: Exception that occurred
        context: Additional context about the error
    """
    context_str = ""
    if context:
        context_str = " | Context: " + ", ".join([f"{k}={v}" for k, v in context.items()])

    logger.error(
        f"{error.__class__.__name__}: {str(error)}{context_str}",
        exc_info=True,
    )


# Initialize logging when module is imported
setup_logging()
