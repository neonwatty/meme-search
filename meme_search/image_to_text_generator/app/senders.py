from log_config import logging
import requests


def description_sender(output_job_details: dict, APP_URL: str) -> None:
    try:
        response = requests.post(APP_URL + "description_receiver", json={"data": output_job_details}, timeout=30)
        if response.status_code == 200:
            logging.info(f"SUCCESS: description_sender successfully delivered {output_job_details}")
        else:
            logging.info(f"FAILURE: description_sender failed to deliver {output_job_details} with response code {response.status_code}")
    except Exception as e:
        failure_message = f"FAILURE: description_sender failed with exception {e}"
        logging.error(failure_message)


def status_sender(status_job_details: dict, APP_URL: str) -> None:
    try:
        response = requests.post(APP_URL + "status_receiver", json={"data": status_job_details}, timeout=30)
        if response.status_code >= 200 and response.status_code < 300:
            logging.info(f"SUCCESS: status_sender successfully delivered {status_job_details}")
        else:
            logging.info(f"FAILURE: status_sender failed to deliver {status_job_details} with response code {response.status_code}")
    except Exception as e:
        failure_message = f"FAILURE: status_sender failed with exception {e}"
        logging.error(failure_message)


def failure_sender(image_core_id: int, error_message: str, APP_URL: str) -> None:
    """Send failure notification to Rails with status=5 (failed) and error message.

    This notifies Rails that image processing has permanently failed, so the UI
    can display the error to the user and stop waiting for results.
    """
    # Send status=5 (failed)
    status_job_details = {"image_core_id": image_core_id, "status": 5}
    status_sender(status_job_details, APP_URL)

    # Send error message as description so user can see what went wrong
    error_job_details = {"image_core_id": image_core_id, "description": f"Error: {error_message}"}
    try:
        response = requests.post(APP_URL + "description_receiver", json={"data": error_job_details}, timeout=30)
        if response.status_code == 200:
            logging.info(f"SUCCESS: failure_sender successfully delivered error for image_core_id={image_core_id}")
        else:
            logging.info(f"FAILURE: failure_sender failed to deliver error with response code {response.status_code}")
    except Exception as e:
        failure_message = f"FAILURE: failure_sender failed with exception {e}"
        logging.error(failure_message)
