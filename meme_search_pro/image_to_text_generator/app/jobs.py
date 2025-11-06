import time
import sqlite3
import threading
from log_config import logging
from image_to_text_generator import image_to_text
from senders import description_sender
from senders import status_sender

# lock
lock = threading.Lock()


def proccess_job(input_job_details: dict) -> dict:
    # simulate job processing
    # time.sleep(5)

    # # Specify the file path
    # from pathlib import Path
    # file_path = Path(input_job_details["image_path"])

    # # Get the size of the file in bytes
    # file_size = file_path.stat().st_size
    # logging.info(f"SIZE OF TEST FILE --> {file_size}")
    # description = "this is a test"

    # process image
    description = image_to_text(input_job_details["image_path"], input_job_details["model"])

    # create return payload
    output_job_details = {
        "image_core_id": input_job_details["image_core_id"],
        "description": description,
    }
    return output_job_details


def process_jobs(JOB_DB, APP_URL):
    logging.info("Worker thread started - ready to process jobs")
    while True:
        conn = None
        try:
            with lock:
                conn = sqlite3.connect(JOB_DB)
                cursor = conn.cursor()

                cursor.execute("SELECT * FROM jobs ORDER BY id LIMIT 1")
                job = cursor.fetchone()

                if job:
                    # unpack job
                    job_id, image_core_id, image_path, model = job

                    # pack up data for processing / status update
                    input_job_details = {
                        "image_core_id": image_core_id,
                        "image_path": "/app/public/memes/" + image_path if "tests" not in JOB_DB else image_path,
                        "model": model,
                    }
                    status_job_details = {"image_core_id": image_core_id, "status": 2}

                    # send status update (image out of queue and in process)
                    status_sender(status_job_details, APP_URL)

                    # report that processing has begun
                    logging.info("Processing job: %s", input_job_details)

                    # process job
                    output_job_details = proccess_job(input_job_details)

                    # send results to main app
                    description_sender(output_job_details, APP_URL)

                    # send status update (image processing complete)
                    status_job_details["status"] = 3
                    status_sender(status_job_details, APP_URL)

                    # log completion
                    logging.info("Finished processing job: %s", input_job_details)

                    # Remove the processed job from the queue
                    cursor.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
                    conn.commit()
                else:
                    # If there are no jobs, wait for a while before checking again
                    logging.info("No jobs in queue. Waiting...")

                # Always close connection before sleep/continue
                if conn:
                    conn.close()
                    conn = None

            # Sleep outside the lock to allow other operations
            if not job:
                time.sleep(5)

        except Exception as e:
            logging.error(f"Worker thread error: {e}", exc_info=True)
            # Close connection on error
            if conn:
                try:
                    conn.close()
                except Exception:
                    pass
            # Sleep before retrying
            time.sleep(5)
