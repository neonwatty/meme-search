import os


# system constants
APP_PORT = os.environ.get("APP_PORT", "3000")
# Use GEN_URL from environment (set by Docker) or fall back to localhost for testing
GEN_URL = os.environ.get("GEN_URL", f"http://127.0.0.1:{APP_PORT}")
APP_URL = GEN_URL + "/image_cores/"
JOB_DB = "/app/db/job_queue.db"

# model constants
default_model = "Florence-2-base"
available_models = ["test", default_model, "Florence-2-large", "SmolVLM-256M-Instruct", "SmolVLM-500M-Instruct",  "moondream2"]
