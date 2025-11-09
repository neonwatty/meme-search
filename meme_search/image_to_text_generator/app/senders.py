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
