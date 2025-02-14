import subprocess
import time
import requests

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
    """Test the process_image route."""
    app_process = subprocess.Popen(APP_START_CMD, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    dummy_process = subprocess.Popen(DUMMY_START_CMD, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    try:
        # Start image to text serverserver
        assert wait_for_server(SERVER_URL), "Image to text server did not start in time"

        # Start dummy server to receive sender messages
        # STOPPED HERE - FINISH DUMMY TEST FOR PROCESSING

        # Send in POST request with image_core_id, path to image, and 'test' model
        response = requests.post(SERVER_URL + "/add_job", json={"image_core_id": 0, "image_path": "../app/do_not_remove.jpg", "model": "test"})

        # Verify response
        assert response.status_code == 200
        assert response.json() == {"status": "Job added to queue"}

        # Start server to receive message: response = requests.post(APP_URL + "description_receiver", json={"data": output_job_details})


        response = requests.post(SERVER_URL + "/process_image", json={"image_core_id": "test"})
        assert response.status_code == 200
        assert response.json() == {"status": "Job removed from queue"}
    finally:
        app_process.terminate()  # Stop the process after test
        app_process.wait()  # Ensure process cleanup