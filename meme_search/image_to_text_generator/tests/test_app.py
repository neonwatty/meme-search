import subprocess
import time
import requests
import os


APP_START_CMD = ["python", "app/app.py", "testing"]  # Command for app start
DUMMY_START_CMD = ["python", "tests/dummy_app_server.py"] # Command for dummy server start

SERVER_URL = "http://127.0.0.1:8000"  # URL of the image to text server
DUMMY_URL = "http://127.0.0.1:3000"  # URL of the dummy server


def wait_for_server(url, timeout=10):
    """Wait for the server to start by making requests."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            response = requests.get(url)
            if response.status_code == 200:
                return True
        except requests.ConnectionError:
            time.sleep(0.5)
    return False


def test_app_starts():
    """Test if the FastAPI app starts up and is accessible."""
    process = subprocess.Popen(APP_START_CMD, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    try:
        assert wait_for_server(SERVER_URL), "Server did not start in time"
    finally:
        process.terminate()  # Stop the process after test
        process.wait()  # Ensure process cleanup


def test_app_hello_world():
    """Test the home route."""
    process = subprocess.Popen(APP_START_CMD, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    try:
        assert wait_for_server(SERVER_URL), "Server did not start in time"
        response = requests.get(SERVER_URL)
        assert response.status_code == 200
        assert response.json() == {"status": "HELLO WORLD"}
    finally:
        process.terminate()  # Stop the process after test
        process.wait()  # Ensure process cleanup


def test_dummy_start():
    """Test if the dummy server starts up and is accessible."""
    process = subprocess.Popen(DUMMY_START_CMD, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    try:
        assert wait_for_server(DUMMY_URL), "Dummy server did not start in time"
    finally:
        process.terminate()  # Stop the process after test
        process.wait()  # Ensure process cleanup


def test_dummy_hello_world():
    """Test the home route of the dummy server."""
    process = subprocess.Popen(DUMMY_START_CMD, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    try:
        assert wait_for_server(DUMMY_URL), "Dummy server did not start in time"
        response = requests.get(DUMMY_URL)
        assert response.status_code == 200
        assert response.json() == {"status": "HELLO WORLD"}
    finally:
        process.terminate()  # Stop the process after test
        process.wait()  # Ensure process cleanup


# Test processing with 'test' model
def test_process_image():
    """Test the process_image route with the 'test' model."""
    app_process = subprocess.Popen(APP_START_CMD, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    dummy_process = subprocess.Popen(DUMMY_START_CMD, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    os.set_blocking(app_process.stdout.fileno(), False)
    os.set_blocking(dummy_process.stdout.fileno(), False)

    try:
        # Start image to text serverserver
        assert wait_for_server(SERVER_URL, timeout=360), "Image to text server did not start in time"

        # Start dummy server to receive sender messages
        assert wait_for_server(DUMMY_URL), "Dummy server did not start in time"

        # Send in POST request with image_core_id, path to image, and 'test' model
        response = requests.post(SERVER_URL + "/add_job", json={"image_core_id": 0, "image_path": "./app/do_not_remove.jpg", "model": "test"})

        # Verify response
        assert response.status_code == 200
        assert response.json() == {"status": "Job added to queue"}

        # Check queue
        response = requests.get(SERVER_URL + "/check_queue")
        assert response.status_code == 200
        assert response.json() == {"queue_length": 1}, "Queue length is not 1"

        # Send in second POST request with image_core_id, path to image, and 'test' model
        response = requests.post(SERVER_URL + "/add_job", json={"image_core_id": 1, "image_path": "./app/do_not_remove.jpg", "model": "test"})
        assert response.status_code == 200
        assert response.json() == {"status": "Job added to queue"}

        # Check queue
        response = requests.get(SERVER_URL + "/check_queue")
        assert response.status_code == 200
        assert response.json() == {"queue_length": 2}, "Queue length is not 2"

        # Remove job
        response = requests.delete(SERVER_URL + "/remove_job/1")
        assert response.status_code == 200
        assert response.json() == {"status": "Job removed from queue"}

        # Check queue
        response = requests.get(SERVER_URL + "/check_queue")
        assert response.status_code == 200
        assert response.json() == {"queue_length": 1}, "Queue length is not 1"

        # Tail dummy server logs
        time.sleep(6)
        app_logs = ""
        for _ in range(30):
            logline = app_process.stderr.readline().strip()
            if isinstance(logline, str):
                app_logs += logline

        assert "status_sender successfully delivered" in app_logs, "status_sender failed"
        assert "description_sender successfully delivered" in app_logs, "description_sender failed"

    finally:
        app_process.terminate()  
        app_process.wait() 
        dummy_process.terminate()
        dummy_process.wait()


# REMOVED: test_processing_florence_base() - too slow for CI (60s+, downloads 500MB AI model)
# Real AI model testing is covered by unit tests (tests/unit/test_image_to_text_generator.py)
# The 'test' model above provides sufficient integration test coverage


# def test_processing_smolvlm_256():
#     """Test processing with 'SmolVLM-256M-Instruct' model."""
#     app_process = subprocess.Popen(APP_START_CMD, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
#     dummy_process = subprocess.Popen(DUMMY_START_CMD, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

#     os.set_blocking(app_process.stdout.fileno(), False)
#     os.set_blocking(dummy_process.stdout.fileno(), False)

#     try:
#         # Start image to text serverserver
#         assert wait_for_server(SERVER_URL), "Image to text server did not start in time"

#         # Start dummy server to receive sender messages
#         assert wait_for_server(DUMMY_URL), "Dummy server did not start in time"

#         # Send in POST request with image_core_id, path to image, and 'test' model
#         response = requests.post(SERVER_URL + "/add_job", json={"image_core_id": 0, "image_path": "./app/do_not_remove.jpg", "model": "SmolVLM-256M-Instruct"})

#         # Verify response
#         assert response.status_code == 200
#         assert response.json() == {"status": "Job added to queue"}

#         # Check queue
#         response = requests.get(SERVER_URL + "/check_queue")
#         assert response.status_code == 200
#         assert response.json() == {"queue_length": 1}, "Queue length is not 1"

#         # Send in second POST request with image_core_id, path to image, and 'test' model
#         response = requests.post(SERVER_URL + "/add_job", json={"image_core_id": 1, "image_path": "./app/do_not_remove.jpg", "model": "SmolVLM-256M-Instruct"})
#         assert response.status_code == 200
#         assert response.json() == {"status": "Job added to queue"}

#         # Check queue
#         response = requests.get(SERVER_URL + "/check_queue")
#         assert response.status_code == 200
#         assert response.json() == {"queue_length": 2}, "Queue length is not 2"

#         # Remove job
#         response = requests.delete(SERVER_URL + "/remove_job/1")
#         assert response.status_code == 200
#         assert response.json() == {"status": "Job removed from queue"}

#         # Check queue
#         response = requests.get(SERVER_URL + "/check_queue")
#         assert response.status_code == 200
#         assert response.json() == {"queue_length": 1}, "Queue length is not 1"

#         # Tail dummy server logs
#         time.sleep(60)
#         app_logs = ""
#         for _ in range(40):
#             logline = app_process.stderr.readline().strip()
#             if isinstance(logline, str):
#                 app_logs += logline
#         print(app_logs)
#         assert "status_sender successfully delivered" in app_logs, "status_sender failed"
#         assert "description_sender successfully delivered" in app_logs, "description_sender failed"

#     finally:
#         app_process.terminate()  
#         app_process.wait() 
#         dummy_process.terminate()
#         dummy_process.wait()