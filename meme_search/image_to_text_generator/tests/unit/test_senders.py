import pytest
from unittest.mock import Mock, patch, MagicMock
import sys
from pathlib import Path

# Add app directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "app"))

from senders import description_sender, status_sender, failure_sender


class TestDescriptionSender:
    """Test suite for description_sender function"""

    @patch('senders.requests.post')
    def test_description_sender_success(self, mock_post):
        """Test successful description delivery"""
        # Setup
        mock_response = Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response

        output_job_details = {
            "image_core_id": 1,
            "description": "Test description"
        }
        app_url = "http://localhost:3000/"

        # Execute
        description_sender(output_job_details, app_url)

        # Assert
        mock_post.assert_called_once_with(
            "http://localhost:3000/description_receiver",
            json={"data": output_job_details},
            timeout=30
        )

    @patch('senders.requests.post')
    def test_description_sender_failure_status_code(self, mock_post):
        """Test description delivery with non-200 status code"""
        # Setup
        mock_response = Mock()
        mock_response.status_code = 500
        mock_post.return_value = mock_response

        output_job_details = {
            "image_core_id": 1,
            "description": "Test description"
        }
        app_url = "http://localhost:3000/"

        # Execute - should not raise exception
        description_sender(output_job_details, app_url)

        # Assert
        mock_post.assert_called_once()

    @patch('senders.requests.post')
    def test_description_sender_exception_handling(self, mock_post):
        """Test description sender handles exceptions gracefully"""
        # Setup
        mock_post.side_effect = Exception("Network error")

        output_job_details = {
            "image_core_id": 1,
            "description": "Test description"
        }
        app_url = "http://localhost:3000/"

        # Execute - should not raise exception
        description_sender(output_job_details, app_url)

        # Assert
        mock_post.assert_called_once()

    @patch('senders.requests.post')
    def test_description_sender_constructs_correct_url(self, mock_post):
        """Test that URL is constructed correctly"""
        # Setup
        mock_response = Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response

        output_job_details = {"image_core_id": 1, "description": "Test"}
        app_url = "http://example.com:8080/"

        # Execute
        description_sender(output_job_details, app_url)

        # Assert correct URL construction
        expected_url = "http://example.com:8080/description_receiver"
        mock_post.assert_called_once()
        assert mock_post.call_args[0][0] == expected_url


class TestStatusSender:
    """Test suite for status_sender function"""

    @patch('senders.requests.post')
    def test_status_sender_success_200(self, mock_post):
        """Test successful status delivery with 200 status code"""
        # Setup
        mock_response = Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response

        status_job_details = {
            "image_core_id": 1,
            "status": 2  # processing
        }
        app_url = "http://localhost:3000/"

        # Execute
        status_sender(status_job_details, app_url)

        # Assert
        mock_post.assert_called_once_with(
            "http://localhost:3000/status_receiver",
            json={"data": status_job_details},
            timeout=30
        )

    @patch('senders.requests.post')
    def test_status_sender_success_201(self, mock_post):
        """Test successful status delivery with 201 status code"""
        # Setup
        mock_response = Mock()
        mock_response.status_code = 201
        mock_post.return_value = mock_response

        status_job_details = {
            "image_core_id": 1,
            "status": 3  # done
        }
        app_url = "http://localhost:3000/"

        # Execute
        status_sender(status_job_details, app_url)

        # Assert
        mock_post.assert_called_once()

    @patch('senders.requests.post')
    def test_status_sender_success_299(self, mock_post):
        """Test status delivery with 299 status code (edge of 2xx range)"""
        # Setup
        mock_response = Mock()
        mock_response.status_code = 299
        mock_post.return_value = mock_response

        status_job_details = {"image_core_id": 1, "status": 3}
        app_url = "http://localhost:3000/"

        # Execute
        status_sender(status_job_details, app_url)

        # Assert - should be treated as success
        mock_post.assert_called_once()

    @patch('senders.requests.post')
    def test_status_sender_failure_400(self, mock_post):
        """Test status delivery with 400 status code"""
        # Setup
        mock_response = Mock()
        mock_response.status_code = 400
        mock_post.return_value = mock_response

        status_job_details = {"image_core_id": 1, "status": 1}
        app_url = "http://localhost:3000/"

        # Execute - should not raise exception
        status_sender(status_job_details, app_url)

        # Assert
        mock_post.assert_called_once()

    @patch('senders.requests.post')
    def test_status_sender_failure_500(self, mock_post):
        """Test status delivery with 500 status code"""
        # Setup
        mock_response = Mock()
        mock_response.status_code = 500
        mock_post.return_value = mock_response

        status_job_details = {"image_core_id": 1, "status": 5}
        app_url = "http://localhost:3000/"

        # Execute - should not raise exception
        status_sender(status_job_details, app_url)

        # Assert
        mock_post.assert_called_once()

    @patch('senders.requests.post')
    def test_status_sender_exception_handling(self, mock_post):
        """Test status sender handles exceptions gracefully"""
        # Setup
        mock_post.side_effect = Exception("Connection timeout")

        status_job_details = {"image_core_id": 1, "status": 2}
        app_url = "http://localhost:3000/"

        # Execute - should not raise exception
        status_sender(status_job_details, app_url)

        # Assert
        mock_post.assert_called_once()

    @patch('senders.requests.post')
    def test_status_sender_constructs_correct_url(self, mock_post):
        """Test that URL is constructed correctly"""
        # Setup
        mock_response = Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response

        status_job_details = {"image_core_id": 1, "status": 1}
        app_url = "http://example.com:8080/"

        # Execute
        status_sender(status_job_details, app_url)

        # Assert correct URL construction
        expected_url = "http://example.com:8080/status_receiver"
        mock_post.assert_called_once()
        assert mock_post.call_args[0][0] == expected_url

    @patch('senders.requests.post')
    def test_status_sender_with_different_status_values(self, mock_post):
        """Test status sender with various status values"""
        # Setup
        mock_response = Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response

        app_url = "http://localhost:3000/"

        # Test different status values
        for status in [0, 1, 2, 3, 4, 5]:
            mock_post.reset_mock()
            status_job_details = {"image_core_id": 1, "status": status}

            # Execute
            status_sender(status_job_details, app_url)

            # Assert
            mock_post.assert_called_once()


class TestFailureSender:
    """Test suite for failure_sender function"""

    @patch('senders.requests.post')
    @patch('senders.status_sender')
    def test_failure_sender_sends_status_5(self, mock_status_sender, mock_post):
        """Test failure_sender sends status=5 (failed)"""
        # Setup
        mock_response = Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response

        # Execute
        failure_sender(42, "Image file not found", "http://localhost:3000/")

        # Assert - status_sender called with status=5
        mock_status_sender.assert_called_once_with(
            {"image_core_id": 42, "status": 5},
            "http://localhost:3000/"
        )

    @patch('senders.requests.post')
    @patch('senders.status_sender')
    def test_failure_sender_sends_error_description(self, mock_status_sender, mock_post):
        """Test failure_sender sends error message to description_receiver"""
        # Setup
        mock_response = Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response

        # Execute
        failure_sender(42, "Image file not found", "http://localhost:3000/")

        # Assert - description sent with error prefix
        mock_post.assert_called_once_with(
            "http://localhost:3000/description_receiver",
            json={"data": {"image_core_id": 42, "description": "Error: Image file not found"}},
            timeout=30
        )

    @patch('senders.requests.post')
    @patch('senders.status_sender')
    def test_failure_sender_handles_network_error(self, mock_status_sender, mock_post):
        """Test failure_sender handles network errors gracefully"""
        # Setup
        mock_post.side_effect = Exception("Network error")

        # Execute - should not raise exception
        failure_sender(42, "Test error", "http://localhost:3000/")

        # Assert - status still attempted
        mock_status_sender.assert_called_once()

    @patch('senders.requests.post')
    @patch('senders.status_sender')
    def test_failure_sender_with_different_error_messages(self, mock_status_sender, mock_post):
        """Test failure_sender with various error messages"""
        # Setup
        mock_response = Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response

        error_messages = [
            "Image file not found: /path/to/missing.jpg",
            "Image file too large: 15.2MB exceeds 10MB limit",
            "Invalid or corrupt image file: /path/to/corrupt.jpg",
            "Max retries (3) exceeded. Last error: Model download failed"
        ]

        for error_msg in error_messages:
            mock_post.reset_mock()
            mock_status_sender.reset_mock()

            # Execute
            failure_sender(99, error_msg, "http://localhost:3000/")

            # Assert
            mock_status_sender.assert_called_once_with(
                {"image_core_id": 99, "status": 5},
                "http://localhost:3000/"
            )
            # Check error message is prefixed with "Error: "
            call_args = mock_post.call_args[1]["json"]["data"]
            assert call_args["description"] == f"Error: {error_msg}"
