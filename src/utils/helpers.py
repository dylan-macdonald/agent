"""
Helper utility functions for the autonomous assistant.
"""

import hashlib
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID


def hash_text(text: str) -> str:
    """
    Create a hash of text for caching.

    Args:
        text: Text to hash

    Returns:
        SHA-256 hash of the text
    """
    return hashlib.sha256(text.encode()).hexdigest()


def truncate_text(text: str, max_length: int = 100, suffix: str = "...") -> str:
    """
    Truncate text to a maximum length.

    Args:
        text: Text to truncate
        max_length: Maximum length
        suffix: Suffix to add if truncated

    Returns:
        Truncated text
    """
    if len(text) <= max_length:
        return text
    return text[: max_length - len(suffix)] + suffix


def format_phone_number(phone: str) -> str:
    """
    Format phone number to E.164 format.

    Args:
        phone: Phone number to format

    Returns:
        Formatted phone number

    Example:
        >>> format_phone_number("1234567890")
        '+1234567890'
    """
    # Remove all non-numeric characters
    digits = "".join(filter(str.isdigit, phone))

    # Add + prefix if not present
    if not digits.startswith("+"):
        digits = f"+{digits}"

    return digits


def safe_json_serialize(obj: Any) -> Any:
    """
    Safely serialize objects to JSON-compatible format.

    Handles datetime, UUID, and other non-JSON types.

    Args:
        obj: Object to serialize

    Returns:
        JSON-serializable version of the object
    """
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, UUID):
        return str(obj)
    elif isinstance(obj, bytes):
        return obj.decode("utf-8")
    elif isinstance(obj, dict):
        return {k: safe_json_serialize(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [safe_json_serialize(item) for item in obj]
    else:
        return obj


def chunk_list(items: List[Any], chunk_size: int) -> List[List[Any]]:
    """
    Split a list into chunks.

    Args:
        items: List to chunk
        chunk_size: Size of each chunk

    Returns:
        List of chunks

    Example:
        >>> chunk_list([1, 2, 3, 4, 5], 2)
        [[1, 2], [3, 4], [5]]
    """
    return [items[i : i + chunk_size] for i in range(0, len(items), chunk_size)]


def merge_dicts(*dicts: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merge multiple dictionaries, with later values overwriting earlier ones.

    Args:
        *dicts: Dictionaries to merge

    Returns:
        Merged dictionary

    Example:
        >>> merge_dicts({"a": 1}, {"b": 2}, {"a": 3})
        {'a': 3, 'b': 2}
    """
    result = {}
    for d in dicts:
        result.update(d)
    return result


def get_nested_value(
    data: Dict[str, Any], path: str, default: Any = None
) -> Any:
    """
    Get a nested value from a dictionary using dot notation.

    Args:
        data: Dictionary to search
        path: Dot-separated path to value (e.g., "user.settings.theme")
        default: Default value if path not found

    Returns:
        Value at path or default

    Example:
        >>> data = {"user": {"settings": {"theme": "dark"}}}
        >>> get_nested_value(data, "user.settings.theme")
        'dark'
    """
    keys = path.split(".")
    value = data

    for key in keys:
        if not isinstance(value, dict):
            return default
        value = value.get(key, default)
        if value is default:
            return default

    return value


def calculate_percentage(part: float, total: float) -> float:
    """
    Calculate percentage safely (handles division by zero).

    Args:
        part: Part value
        total: Total value

    Returns:
        Percentage (0-100)
    """
    if total == 0:
        return 0.0
    return (part / total) * 100


def format_cost(cost: float) -> str:
    """
    Format cost in USD.

    Args:
        cost: Cost in dollars

    Returns:
        Formatted cost string

    Example:
        >>> format_cost(1.234567)
        '$1.23'
    """
    return f"${cost:.2f}"


def format_tokens(tokens: int) -> str:
    """
    Format token count for display.

    Args:
        tokens: Number of tokens

    Returns:
        Formatted token count

    Example:
        >>> format_tokens(1234567)
        '1.23M'
    """
    if tokens < 1000:
        return str(tokens)
    elif tokens < 1_000_000:
        return f"{tokens / 1000:.1f}K"
    else:
        return f"{tokens / 1_000_000:.2f}M"


def validate_uuid(value: str) -> bool:
    """
    Validate if a string is a valid UUID.

    Args:
        value: String to validate

    Returns:
        True if valid UUID, False otherwise
    """
    try:
        UUID(value)
        return True
    except (ValueError, AttributeError):
        return False
