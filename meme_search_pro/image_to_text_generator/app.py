from fastapi import FastAPI
from pydantic import BaseModel
import sqlite3
import time
import threading
import logging
import requests
from image_to_text_generator import image_to_text
import os


app = FastAPI()
lock = threading.Lock()

# constants
APP_URL = "http://" + os.environ.get("HOST_URL", "host.docker.internal") + ":3000/image_cores/"
JOB_DB = "/app/db/job_queue.db"

# initialize logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)


# initialize local db / table
def init_db():
    conn = sqlite3.connect(JOB_DB)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            image_core_id INTEGER,
            image_path TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


# check queue length
def check_queue():
    conn = sqlite3.connect(JOB_DB)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM jobs")
    count = cursor.fetchone()[0]
    return {"queue_length": count}


# initialize model - download weights
def init_model():
    with lock:
        image_path = "do_not_remove.jpg"
        description = image_to_text(image_path)
        logging.info(
            "Finished model download and initial test - image description: %s",
            description,
        )
        logging.info("INFO: ready to process jobs!")


# model for received jobs
class Job(BaseModel):
    image_core_id: int
    image_path: str


def description_sender(output_job_details: dict) -> dict:
    try:
        response = requests.post(
            APP_URL + "description_receiver", json={"data": output_job_details}
        )
        if response.status_code == 200:
            logging.info(
                f"SUCCESS: description_sender successfully delivered {output_job_details}"
            )
        else:
            logging.info(
                f"FAILURE: description_sender failed to deliver {output_job_details} with response code {response.status_code}"
            )
    except Exception as e:
        failure_message = f"FAILURE: description_sender failed with exception {e}"
        logging.error(failure_message)


def status_sender(status_job_details: dict) -> None:
    try:
        response = requests.post(
            APP_URL + "status_receiver", json={"data": status_job_details}
        )
        if response.status_code >= 200 and response.status_code < 300:
            logging.info(
                f"SUCCESS: status_sender successfully delivered {status_job_details}"
            )
        else:
            logging.info(
                f"FAILURE: status_sender failed to deliver {status_job_details} with response code {response.status_code}"
            )
    except Exception as e:
        failure_message = f"FAILURE: status_sender failed with exception {e}"
        logging.error(failure_message)


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
    description = image_to_text(input_job_details["image_path"])

    # create return payload
    output_job_details = {
        "image_core_id": input_job_details["image_core_id"],
        "description": description,
    }
    return output_job_details


def process_jobs():
    while True:
        with lock:
            conn = sqlite3.connect(JOB_DB)
            cursor = conn.cursor()

            cursor.execute("SELECT * FROM jobs ORDER BY id LIMIT 1")
            job = cursor.fetchone()

            if job:
                # unpack job
                job_id, image_core_id, image_path = job

                # pack up data for processing / status update
                input_job_details = {
                    "image_core_id": image_core_id,
                    "image_path": "/public/memes/" + image_path,
                }
                status_job_details = {"image_core_id": image_core_id, "status": 2}

                # send status update (image out of queue and in process)
                status_sender(status_job_details)

                # report that processing has begun
                logging.info("Processing job: %s", input_job_details)

                # process job
                output_job_details = proccess_job(input_job_details)

                # send results to main app
                description_sender(output_job_details)

                # send status update (image out of queue and in process)
                status_job_details["status"] = 3
                status_sender(status_job_details)

                # log completion
                logging.info("Finished processing job: %s", input_job_details)

                # Remove the processed job from the queue
                cursor.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
                conn.commit()
            else:
                # If there are no jobs, wait for a while before checking again
                logging.info("No jobs in queue. Waiting...")
                time.sleep(5)


@app.post("/add_job")
def add_job(job: Job):
    conn = sqlite3.connect(JOB_DB)
    cursor = conn.cursor()

    cursor.execute(
        "INSERT INTO jobs (image_core_id, image_path) VALUES (?, ?)",
        (job.image_core_id, job.image_path),
    )
    conn.commit()
    conn.close()

    logging.info("Job added to queue: %s", job)

    # update status
    status_job_details = {"image_core_id": job.image_core_id, "status": 1}

    # send status update (image out of queue and in process)
    status_sender(status_job_details)

    return {"status": "Job added to queue"}


@app.delete("/remove_job/{image_core_id}")
def remove_job(image_core_id: int):
    conn = sqlite3.connect(JOB_DB)
    cursor = conn.cursor()

    # Check if the job exists
    cursor.execute("SELECT * FROM jobs WHERE image_core_id = ?", (image_core_id,))
    job = cursor.fetchone()

    if job is None:
        conn.close()
        logging.warning(
            "Attempted to remove a job that does not exist: %s", image_core_id
        )
        return {"status": "Job not found"}, 404

    # Remove the job from the database
    cursor.execute("DELETE FROM jobs WHERE image_core_id = ?", (image_core_id,))
    conn.commit()
    conn.close()

    logging.info("Job removed from queue: %s", image_core_id)

    # run status update
    status_job_details = {"image_core_id": image_core_id, "status": 0}
    status_sender(status_job_details)

    return {"status": "Job removed from queue"}


@app.get("/")
def home():
    logging.info("HELLO WORLD")
    return {"status", "HELLO WORLD"}


if __name__ == "__main__":
    # Initialize the database
    init_db()

    # initialize model (optional)
    # init_model()

    # Start the job processing thread
    threading.Thread(target=process_jobs, daemon=True).start()

    # Run the FastAPI app
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
