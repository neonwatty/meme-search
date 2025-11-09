import pytest
import sqlite3
import threading
import time
import sys
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock, call

# Add app directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "app"))

from jobs import proccess_job, process_jobs


class TestProcessJob:
    """Test suite for proccess_job function"""

    @patch('jobs.image_to_text')
    def test_process_job_success_with_test_model(self, mock_image_to_text):
        """Test successful job processing with mocked image_to_text"""
        # Setup
        mock_image_to_text.return_value = "A funny meme with text"

        input_job_details = {
            "image_core_id": 42,
            "image_path": "/app/public/memes/test.jpg",
            "model": "test"
        }

        # Execute
        result = proccess_job(input_job_details)

        # Assert
        assert result == {
            "image_core_id": 42,
            "description": "A funny meme with text"
        }
        mock_image_to_text.assert_called_once_with("/app/public/memes/test.jpg", "test")

    @patch('jobs.image_to_text')
    def test_process_job_returns_correct_output_format(self, mock_image_to_text):
        """Test that process_job returns correctly formatted output"""
        # Setup
        mock_image_to_text.return_value = "Description text"

        input_job_details = {
            "image_core_id": 123,
            "image_path": "/path/to/image.jpg",
            "model": "test"
        }

        # Execute
        result = proccess_job(input_job_details)

        # Assert
        assert "image_core_id" in result
        assert "description" in result
        assert result["image_core_id"] == 123
        assert isinstance(result["description"], str)

    @patch('jobs.image_to_text')
    def test_process_job_raises_on_image_to_text_failure(self, mock_image_to_text):
        """Test that exceptions from image_to_text are propagated"""
        # Setup
        mock_image_to_text.side_effect = Exception("Model inference failed")

        input_job_details = {
            "image_core_id": 42,
            "image_path": "/app/public/memes/test.jpg",
            "model": "test"
        }

        # Execute & Assert
        with pytest.raises(Exception, match="Model inference failed"):
            proccess_job(input_job_details)


class TestProcessJobs:
    """Test suite for process_jobs worker function"""

    @patch('jobs.sqlite3.connect')
    @patch('jobs.proccess_job')
    @patch('jobs.description_sender')
    @patch('jobs.status_sender')
    @patch('jobs.time.sleep')
    def test_process_jobs_worker_processes_single_job(
        self, mock_sleep, mock_status_sender, mock_desc_sender, mock_proccess_job, mock_connect
    ):
        """Test worker processes a single job and exits loop"""
        # Setup mock database with one job, then empty
        mock_conn = Mock()
        mock_cursor = Mock()

        # First call returns a job, second and third calls return None (empty queue)
        mock_cursor.fetchone.side_effect = [
            (1, 42, "test.jpg", "test"),  # First iteration: job found
            None,  # Second iteration: no job
            None   # Third iteration: error recovery loop
        ]

        mock_conn.cursor.return_value = mock_cursor
        mock_connect.return_value = mock_conn

        # Mock proccess_job output
        mock_proccess_job.return_value = {
            "image_core_id": 42,
            "description": "Test description"
        }

        # Make sleep raise exception to break infinite loop after second iteration
        mock_sleep.side_effect = [None, KeyboardInterrupt()]

        # Execute
        try:
            process_jobs("test.db", "http://localhost:3000/")
        except KeyboardInterrupt:
            pass

        # Assert
        assert mock_cursor.fetchone.call_count == 3  # First: job, Second & Third: empty queue
        mock_proccess_job.assert_called_once()
        mock_desc_sender.assert_called_once_with(
            {"image_core_id": 42, "description": "Test description"},
            "http://localhost:3000/"
        )
        # Verify status sent twice: in_queue (status=2) and done (status=3)
        assert mock_status_sender.call_count == 2
        mock_cursor.execute.assert_any_call("DELETE FROM jobs WHERE id = ?", (1,))
        mock_conn.commit.assert_called()

    @patch('jobs.sqlite3.connect')
    @patch('jobs.proccess_job')
    @patch('jobs.description_sender')
    @patch('jobs.status_sender')
    @patch('jobs.time.sleep')
    def test_process_jobs_worker_processes_multiple_jobs_sequential(
        self, mock_sleep, mock_status_sender, mock_desc_sender, mock_proccess_job, mock_connect
    ):
        """Test worker processes multiple jobs in FIFO order"""
        # Setup mock database with two jobs, then empty
        mock_conn = Mock()
        mock_cursor = Mock()

        # Three calls: two jobs, then empty
        mock_cursor.fetchone.side_effect = [
            (1, 10, "image1.jpg", "test"),
            (2, 20, "image2.jpg", "test"),
            None  # Empty queue
        ]

        mock_conn.cursor.return_value = mock_cursor
        mock_connect.return_value = mock_conn

        # Mock proccess_job to return different descriptions
        mock_proccess_job.side_effect = [
            {"image_core_id": 10, "description": "First image"},
            {"image_core_id": 20, "description": "Second image"}
        ]

        # Break loop after processing
        mock_sleep.side_effect = [None, None, KeyboardInterrupt()]

        # Execute
        try:
            process_jobs("test.db", "http://localhost:3000/")
        except KeyboardInterrupt:
            pass

        # Assert
        assert mock_proccess_job.call_count == 2
        assert mock_desc_sender.call_count == 2
        # Verify DELETE called for both jobs
        mock_cursor.execute.assert_any_call("DELETE FROM jobs WHERE id = ?", (1,))
        mock_cursor.execute.assert_any_call("DELETE FROM jobs WHERE id = ?", (2,))

    @patch('jobs.sqlite3.connect')
    @patch('jobs.time.sleep')
    def test_process_jobs_worker_handles_empty_queue(self, mock_sleep, mock_connect):
        """Test worker sleeps and continues when queue is empty"""
        # Setup mock database with no jobs
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.fetchone.return_value = None
        mock_conn.cursor.return_value = mock_cursor
        mock_connect.return_value = mock_conn

        # Break loop after first sleep
        mock_sleep.side_effect = [KeyboardInterrupt()]

        # Execute
        try:
            process_jobs("test.db", "http://localhost:3000/")
        except KeyboardInterrupt:
            pass

        # Assert
        mock_cursor.fetchone.assert_called_once()
        mock_sleep.assert_called_once_with(5)
        # Connection should be closed
        mock_conn.close.assert_called()

    @patch('jobs.sqlite3.connect')
    @patch('jobs.time.sleep')
    def test_process_jobs_worker_handles_database_connection_failure(
        self, mock_sleep, mock_connect
    ):
        """Test worker handles database connection failures gracefully"""
        # Setup mock to raise exception on connect
        mock_connect.side_effect = [
            sqlite3.OperationalError("database is locked"),
            KeyboardInterrupt()  # Exit on second iteration
        ]

        mock_sleep.side_effect = [None]

        # Execute
        try:
            process_jobs("test.db", "http://localhost:3000/")
        except KeyboardInterrupt:
            pass

        # Assert - worker should sleep and continue after error
        mock_sleep.assert_called_with(5)
        assert mock_connect.call_count == 2

    @patch('jobs.sqlite3.connect')
    @patch('jobs.proccess_job')
    @patch('jobs.description_sender')
    @patch('jobs.status_sender')
    @patch('jobs.time.sleep')
    def test_process_jobs_worker_sends_status_processing(
        self, mock_sleep, mock_status_sender, mock_desc_sender, mock_proccess_job, mock_connect
    ):
        """Test worker sends status updates when processing jobs"""
        # Setup
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.fetchone.side_effect = [(1, 42, "test.jpg", "test"), None, None]
        mock_conn.cursor.return_value = mock_cursor
        mock_connect.return_value = mock_conn

        mock_proccess_job.return_value = {"image_core_id": 42, "description": "Test"}
        mock_sleep.side_effect = [None, KeyboardInterrupt()]

        # Capture status values at call time (avoid dictionary mutation issues)
        captured_statuses = []
        def capture_status(status_dict, url):
            captured_statuses.append(status_dict["status"])
        mock_status_sender.side_effect = capture_status

        # Execute
        try:
            process_jobs("test.db", "http://localhost:3000/")
        except KeyboardInterrupt:
            pass

        # Assert - status_sender should be called twice (processing=2, then done=3)
        assert mock_status_sender.call_count == 2
        # Check that both status values were sent (captured at call time)
        assert captured_statuses == [2, 3], f"Expected statuses [2, 3] (processing → done), got {captured_statuses}"

    @patch('jobs.sqlite3.connect')
    @patch('jobs.proccess_job')
    @patch('jobs.description_sender')
    @patch('jobs.status_sender')
    @patch('jobs.time.sleep')
    def test_process_jobs_worker_sends_status_done(
        self, mock_sleep, mock_status_sender, mock_desc_sender, mock_proccess_job, mock_connect
    ):
        """Test worker sends status=3 (done) when job completes"""
        # Setup
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.fetchone.side_effect = [(1, 42, "test.jpg", "test"), None]
        mock_conn.cursor.return_value = mock_cursor
        mock_connect.return_value = mock_conn

        mock_proccess_job.return_value = {"image_core_id": 42, "description": "Test"}
        mock_sleep.side_effect = [None, KeyboardInterrupt()]

        # Execute
        try:
            process_jobs("test.db", "http://localhost:3000/")
        except KeyboardInterrupt:
            pass

        # Assert - second status call should be status=3 (done)
        second_call = mock_status_sender.call_args_list[1]
        assert second_call[0][0]["status"] == 3

    @patch('jobs.sqlite3.connect')
    @patch('jobs.proccess_job')
    @patch('jobs.description_sender')
    @patch('jobs.status_sender')
    @patch('jobs.time.sleep')
    def test_process_jobs_worker_calls_description_sender(
        self, mock_sleep, mock_status_sender, mock_desc_sender, mock_proccess_job, mock_connect
    ):
        """Test worker calls description_sender with job output"""
        # Setup
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.fetchone.side_effect = [(1, 42, "test.jpg", "test"), None]
        mock_conn.cursor.return_value = mock_cursor
        mock_connect.return_value = mock_conn

        expected_output = {"image_core_id": 42, "description": "Funny cat meme"}
        mock_proccess_job.return_value = expected_output
        mock_sleep.side_effect = [None, KeyboardInterrupt()]

        # Execute
        try:
            process_jobs("test.db", "http://localhost:3000/")
        except KeyboardInterrupt:
            pass

        # Assert
        mock_desc_sender.assert_called_once_with(
            expected_output,
            "http://localhost:3000/"
        )

    @patch('jobs.sqlite3.connect')
    @patch('jobs.proccess_job')
    @patch('jobs.description_sender')
    @patch('jobs.status_sender')
    @patch('jobs.time.sleep')
    def test_process_jobs_worker_deletes_job_after_processing(
        self, mock_sleep, mock_status_sender, mock_desc_sender, mock_proccess_job, mock_connect
    ):
        """Test worker deletes job from queue after successful processing"""
        # Setup
        mock_conn = Mock()
        mock_cursor = Mock()
        job_id = 99
        mock_cursor.fetchone.side_effect = [(job_id, 42, "test.jpg", "test"), None]
        mock_conn.cursor.return_value = mock_cursor
        mock_connect.return_value = mock_conn

        mock_proccess_job.return_value = {"image_core_id": 42, "description": "Test"}
        mock_sleep.side_effect = [None, KeyboardInterrupt()]

        # Execute
        try:
            process_jobs("test.db", "http://localhost:3000/")
        except KeyboardInterrupt:
            pass

        # Assert
        mock_cursor.execute.assert_any_call("DELETE FROM jobs WHERE id = ?", (job_id,))
        mock_conn.commit.assert_called()

    @patch('jobs.sqlite3.connect')
    @patch('jobs.proccess_job')
    @patch('jobs.description_sender')
    @patch('jobs.status_sender')
    @patch('jobs.time.sleep')
    @patch('jobs.logging')
    def test_process_jobs_worker_continues_after_exception(
        self, mock_logging, mock_sleep, mock_status_sender,
        mock_desc_sender, mock_proccess_job, mock_connect
    ):
        """Test worker continues processing after an exception"""
        # Setup
        mock_conn = Mock()
        mock_cursor = Mock()

        # First job raises exception, second job succeeds, then empty
        mock_cursor.fetchone.side_effect = [
            (1, 10, "bad.jpg", "test"),      # First job (will fail)
            (2, 20, "good.jpg", "test"),     # Second job (succeeds)
            None                              # Empty queue
        ]

        mock_conn.cursor.return_value = mock_cursor
        mock_connect.return_value = mock_conn

        # First call raises exception, second succeeds
        mock_proccess_job.side_effect = [
            Exception("Image processing failed"),
            {"image_core_id": 20, "description": "Success"}
        ]

        mock_sleep.side_effect = [None, None, None, KeyboardInterrupt()]

        # Execute
        try:
            process_jobs("test.db", "http://localhost:3000/")
        except KeyboardInterrupt:
            pass

        # Assert - worker should log error and continue
        mock_logging.error.assert_called()
        # Second job should still be processed
        assert mock_proccess_job.call_count == 2

    @patch('jobs.sqlite3.connect')
    @patch('jobs.proccess_job')
    @patch('jobs.description_sender')
    @patch('jobs.status_sender')
    @patch('jobs.time.sleep')
    def test_process_job_handles_image_path_production_mode(
        self, mock_sleep, mock_status_sender, mock_desc_sender, mock_proccess_job, mock_connect
    ):
        """Test path transformation for production environment"""
        # Setup
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.fetchone.side_effect = [(1, 42, "memes/test.jpg", "test"), None]
        mock_conn.cursor.return_value = mock_cursor
        mock_connect.return_value = mock_conn

        mock_proccess_job.return_value = {"image_core_id": 42, "description": "Test"}
        mock_sleep.side_effect = [None, KeyboardInterrupt()]

        # Execute with production database path (no "tests" in path)
        try:
            process_jobs("/app/jobs.db", "http://localhost:3000/")
        except KeyboardInterrupt:
            pass

        # Assert - image_path should be prefixed with /app/public/memes/
        call_args = mock_proccess_job.call_args[0][0]
        assert call_args["image_path"] == "/app/public/memes/memes/test.jpg"

    @patch('jobs.sqlite3.connect')
    @patch('jobs.proccess_job')
    @patch('jobs.description_sender')
    @patch('jobs.status_sender')
    @patch('jobs.time.sleep')
    def test_process_job_handles_image_path_test_mode(
        self, mock_sleep, mock_status_sender, mock_desc_sender, mock_proccess_job, mock_connect
    ):
        """Test path transformation for test environment"""
        # Setup
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.fetchone.side_effect = [(1, 42, "/full/path/test.jpg", "test"), None]
        mock_conn.cursor.return_value = mock_cursor
        mock_connect.return_value = mock_conn

        mock_proccess_job.return_value = {"image_core_id": 42, "description": "Test"}
        mock_sleep.side_effect = [None, KeyboardInterrupt()]

        # Execute with test database path ("tests" in path)
        try:
            process_jobs("/tests/test.db", "http://localhost:3000/")
        except KeyboardInterrupt:
            pass

        # Assert - image_path should NOT be prefixed (use as-is)
        call_args = mock_proccess_job.call_args[0][0]
        assert call_args["image_path"] == "/full/path/test.jpg"
