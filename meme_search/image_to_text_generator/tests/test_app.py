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


def test_missing_image_sends_failure_and_removes_job():
    """Test that a missing image file triggers failure notification and removes job from queue.

    This test proves the fix for GitHub issue #144: the service no longer retries forever
    on missing images - it sends status=5 (failed) and removes the job.
    """
    app_process = subprocess.Popen(APP_START_CMD, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    dummy_process = subprocess.Popen(DUMMY_START_CMD, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    os.set_blocking(app_process.stdout.fileno(), False)
    os.set_blocking(app_process.stderr.fileno(), False)
    os.set_blocking(dummy_process.stdout.fileno(), False)
    os.set_blocking(dummy_process.stderr.fileno(), False)

    try:
        # Start servers
        assert wait_for_server(SERVER_URL, timeout=30), "Image to text server did not start in time"
        assert wait_for_server(DUMMY_URL), "Dummy server did not start in time"

        # Submit job with a path to a file that doesn't exist
        response = requests.post(
            SERVER_URL + "/add_job",
            json={"image_core_id": 999, "image_path": "./nonexistent/missing_image.jpg", "model": "test"}
        )
        assert response.status_code == 200
        assert response.json() == {"status": "Job added to queue"}

        # Verify job is in queue
        response = requests.get(SERVER_URL + "/check_queue")
        assert response.status_code == 200
        assert response.json() == {"queue_length": 1}

        # Wait for worker to wake up (5s sleep cycle) and process the job
        # Permanent errors should fail immediately once processed
        time.sleep(8)

        # Collect app logs to verify failure was handled
        app_logs = ""
        for _ in range(100):
            line = app_process.stderr.readline()
            if line:
                app_logs += line

        # Verify failure notification was sent (check for key log messages)
        assert "permanently failed" in app_logs or "Image file not found" in app_logs, \
            f"Expected failure notification in logs. Got: {app_logs}"

        # Verify job was removed from queue (not stuck in infinite retry)
        response = requests.get(SERVER_URL + "/check_queue")
        assert response.status_code == 200
        assert response.json() == {"queue_length": 0}, "Job should be removed from queue after failure"

        # Check dummy server received status=5 (failed)
        dummy_logs = ""
        for _ in range(30):
            line = dummy_process.stderr.readline()
            if line:
                dummy_logs += line

        assert "STATUS RECEIVER" in dummy_logs, "Status receiver should have been called"
        # The dummy logs should show status: 5 was sent
        assert "'status': 5" in dummy_logs or '"status": 5' in dummy_logs, \
            f"Expected status=5 (failed) in dummy logs. Got: {dummy_logs}"

    finally:
        app_process.terminate()
        app_process.wait()
        dummy_process.terminate()
        dummy_process.wait()


def test_corrupt_image_sends_failure_and_removes_job():
    """Test that a corrupt image file triggers failure notification and removes job from queue.

    This test proves the fix for GitHub issue #144: the service correctly handles
    corrupt images by sending status=5 (failed) and removing the job.
    """
    import tempfile

    app_process = subprocess.Popen(APP_START_CMD, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    dummy_process = subprocess.Popen(DUMMY_START_CMD, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    os.set_blocking(app_process.stdout.fileno(), False)
    os.set_blocking(app_process.stderr.fileno(), False)
    os.set_blocking(dummy_process.stdout.fileno(), False)
    os.set_blocking(dummy_process.stderr.fileno(), False)

    # Create a corrupt image file
    corrupt_file = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
    corrupt_file.write(b"this is not a valid image file - just random bytes")
    corrupt_file.close()

    try:
        # Start servers
        assert wait_for_server(SERVER_URL, timeout=30), "Image to text server did not start in time"
        assert wait_for_server(DUMMY_URL), "Dummy server did not start in time"

        # Submit job with corrupt image
        response = requests.post(
            SERVER_URL + "/add_job",
            json={"image_core_id": 888, "image_path": corrupt_file.name, "model": "test"}
        )
        assert response.status_code == 200

        # Wait for worker to wake up (5s sleep cycle) and process the job
        time.sleep(8)

        # Collect app logs
        app_logs = ""
        for _ in range(100):
            line = app_process.stderr.readline()
            if line:
                app_logs += line

        # Verify failure was handled (check for key log messages)
        assert "permanently failed" in app_logs or "Invalid or corrupt" in app_logs, \
            f"Expected failure handling in logs. Got: {app_logs}"

        # Verify job was removed from queue
        response = requests.get(SERVER_URL + "/check_queue")
        assert response.status_code == 200
        assert response.json() == {"queue_length": 0}, "Job should be removed from queue after failure"

    finally:
        app_process.terminate()
        app_process.wait()
        dummy_process.terminate()
        dummy_process.wait()
        # Clean up temp file
        os.unlink(corrupt_file.name)


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