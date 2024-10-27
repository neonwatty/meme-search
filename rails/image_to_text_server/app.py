from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import json
import os
import time
import threading
import logging

app = FastAPI()
queue_file = 'job_queue.json'

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Initialize the job queue
if not os.path.exists(queue_file):
    with open(queue_file, 'w') as f:
        json.dump([], f)

class Job(BaseModel):
    job_name: str
    data: str

def process_jobs():
    while True:
        with open(queue_file, 'r+') as f:
            jobs = json.load(f)
            if jobs:
                # Process the first job
                job = jobs.pop(0)
                logging.info("Processing job: %s", job)
                # Simulate processing time
                time.sleep(2)
                logging.info("Finished processing job: %s", job)
                
                # Write back the updated queue
                f.seek(0)
                json.dump(jobs, f)
                f.truncate()
            else:
                # If there are no jobs, wait for a while before checking again
                logging.info("No jobs in queue. Waiting...")
                time.sleep(5)

@app.post('/enqueue')
def enqueue_job(job: Job):
    with open(queue_file, 'r+') as f:
        jobs = json.load(f)
        jobs.append(job.dict())
        f.seek(0)
        json.dump(jobs, f)
        f.truncate()
    
    logging.info("Job added to queue: %s", job)
    return {"status": "Job added to queue"}

if __name__ == '__main__':
    # Start the job processing thread
    threading.Thread(target=process_jobs, daemon=True).start()
    
    # Run the FastAPI app
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)