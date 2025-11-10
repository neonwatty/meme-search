from log_config import logging
import time
from model_init import model_selector


def download_model(model_name: str):
    try:
        current_model = model_selector(model_name)
        current_model.download()
        return current_model
    except Exception as e:
        error_msg = "ERROR: download_model failed with error: {e}"
        logging.error(error_msg)
        raise e


def image_to_text(image_path: str, model_name: str) -> str:
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
    except Exception as e:
        error_msg = "ERROR: image_to_text extraction of image --> %s", image_path + f" failed with error: {e}"
        logging.error(error_msg)
        raise e
