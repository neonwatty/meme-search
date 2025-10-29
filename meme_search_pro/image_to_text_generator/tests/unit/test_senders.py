import pytest
from unittest.mock import Mock, patch, MagicMock
from app.senders import description_sender, status_sender


class TestDescriptionSender:
    """Test suite for description_sender function"""

    @patch('app.senders.requests.post')
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
            json={"data": output_job_details}
        )

    @patch('app.senders.requests.post')
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

    @patch('app.senders.requests.post')
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

    @patch('app.senders.requests.post')
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

    @patch('app.senders.requests.post')
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
            json={"data": status_job_details}
        )

    @patch('app.senders.requests.post')
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

    @patch('app.senders.requests.post')
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

    @patch('app.senders.requests.post')
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

    @patch('app.senders.requests.post')
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

    @patch('app.senders.requests.post')
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

    @patch('app.senders.requests.post')
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

    @patch('app.senders.requests.post')
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
