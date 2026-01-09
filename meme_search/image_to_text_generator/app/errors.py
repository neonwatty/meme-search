"""Custom error classes for image-to-text processing.

These errors help distinguish between permanent failures (should not retry)
and transient failures (may succeed on retry).
"""


class PermanentError(Exception):
    """Errors that should not be retried.

    Examples: file not found, corrupt image, oversized image, unsupported format.
    """

    pass


class TransientError(Exception):
    """Errors that may succeed on retry.

    Examples: network timeout, temporary OOM, model download failure.
    """

    pass


# Maximum file size in bytes (10MB)
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024

# Maximum retry attempts for transient errors
MAX_RETRY_ATTEMPTS = 3

# Exponential backoff delays in seconds
RETRY_DELAYS = [5, 10, 20]
