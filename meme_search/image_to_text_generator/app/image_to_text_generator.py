from log_config import logging
import os
import time
from model_init import model_selector
from errors import PermanentError, TransientError, MAX_IMAGE_SIZE_BYTES
from PIL import Image, UnidentifiedImageError


def validate_image(image_path: str) -> None:
    """Validate image file exists, is not too large, and is a valid image.

    Raises:
        PermanentError: If file doesn't exist, is too large, or is corrupt/invalid.
    """
    # Check file exists
    if not os.path.exists(image_path):
        raise PermanentError(f"Image file not found: {image_path}")

    # Check file size
    file_size = os.path.getsize(image_path)
    if file_size > MAX_IMAGE_SIZE_BYTES:
        size_mb = file_size / (1024 * 1024)
        max_mb = MAX_IMAGE_SIZE_BYTES / (1024 * 1024)
        raise PermanentError(f"Image file too large: {size_mb:.1f}MB exceeds {max_mb:.0f}MB limit")

    # Check file is a valid image
    try:
        with Image.open(image_path) as img:
            img.verify()  # Verify it's a valid image without loading full data
    except UnidentifiedImageError:
        raise PermanentError(f"Invalid or corrupt image file: {image_path}")
    except Exception as e:
        raise PermanentError(f"Cannot read image file: {image_path} - {e}")


def download_model(model_name: str):
    try:
        current_model = model_selector(model_name)
        current_model.download()
        return current_model
    except Exception as e:
        error_msg = f"ERROR: download_model failed with error: {e}"
        logging.error(error_msg)
        # Model download failures are transient (network issues, HuggingFace outages)
        raise TransientError(f"Model download failed: {e}")


def image_to_text(image_path: str, model_name: str) -> str:
    """Extract text description from an image using the specified model.

    Raises:
        PermanentError: If image is invalid, missing, or too large.
        TransientError: If model download fails or temporary processing error.
    """
    # Validate image before processing (raises PermanentError if invalid)
    validate_image(image_path)

    try:
        # get instance of model
        current_model = download_model(model_name)

        # if model is 'test' pause for 5 seconds to allow testing
        if model_name == "test":
            time.sleep(5)

        # process
        description = current_model.extract(image_path)
        logging.info(f"INFO: the description of image {image_path} is: {description}")
        return description
    except (PermanentError, TransientError):
        # Re-raise our custom errors as-is
        raise
    except MemoryError as e:
        # OOM during inference - transient, may succeed on retry with less load
        error_msg = f"ERROR: image_to_text OOM for image {image_path}: {e}"
        logging.error(error_msg)
        raise TransientError(f"Out of memory processing image: {e}")
    except Exception as e:
        # Unexpected errors - treat as transient to allow retry
        error_msg = f"ERROR: image_to_text extraction of image {image_path} failed with error: {e}"
        logging.error(error_msg)
        raise TransientError(f"Image processing failed: {e}")
