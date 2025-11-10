import pytest
from unittest.mock import Mock, patch, MagicMock
import sys
from pathlib import Path

# Add app directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "app"))

from image_to_text_generator import download_model, image_to_text


class TestDownloadModel:
    """Test suite for download_model function"""

    @patch('image_to_text_generator.model_selector')
    def test_download_model_success_test_model(self, mock_model_selector):
        """Test successful model download for test model"""
        # Setup
        mock_model = MagicMock()
        mock_model.download.return_value = None
        mock_model_selector.return_value = mock_model

        # Execute
        result = download_model("test")

        # Assert
        assert result == mock_model
        mock_model_selector.assert_called_once_with("test")
        mock_model.download.assert_called_once()

    @patch('image_to_text_generator.model_selector')
    def test_download_model_success_florence_2_base(self, mock_model_selector):
        """Test successful model download for Florence-2-base"""
        # Setup
        mock_model = MagicMock()
        mock_model.download.return_value = None
        mock_model_selector.return_value = mock_model

        # Execute
        result = download_model("Florence-2-base")

        # Assert
        assert result == mock_model
        mock_model_selector.assert_called_once_with("Florence-2-base")
        mock_model.download.assert_called_once()

    @patch('image_to_text_generator.model_selector')
    def test_download_model_invalid_model_raises_exception(self, mock_model_selector):
        """Test download_model raises exception for invalid model"""
        # Setup
        mock_model_selector.side_effect = ValueError("model_name invalid-model not found")

        # Execute & Assert
        with pytest.raises(ValueError, match="model_name invalid-model not found"):
            download_model("invalid-model")

    @patch('image_to_text_generator.model_selector')
    def test_download_model_download_failure_raises_exception(self, mock_model_selector):
        """Test download_model raises exception when download fails"""
        # Setup
        mock_model = MagicMock()
        mock_model.download.side_effect = Exception("Download failed")
        mock_model_selector.return_value = mock_model

        # Execute & Assert
        with pytest.raises(Exception, match="Download failed"):
            download_model("test")


class TestImageToText:
    """Test suite for image_to_text function"""

    @patch('image_to_text_generator.time.sleep')
    @patch('image_to_text_generator.download_model')
    def test_image_to_text_success_with_test_model(self, mock_download_model, mock_sleep):
        """Test successful image to text extraction with test model"""
        # Setup
        mock_model = MagicMock()
        mock_model.extract.return_value = "This is a test description"
        mock_download_model.return_value = mock_model

        # Execute
        result = image_to_text("/path/to/image.jpg", "test")

        # Assert
        assert result == "This is a test description"
        mock_download_model.assert_called_once_with("test")
        mock_model.extract.assert_called_once_with("/path/to/image.jpg")
        # Verify test model sleeps for 5 seconds
        mock_sleep.assert_called_once_with(5)

    @patch('image_to_text_generator.time.sleep')
    @patch('image_to_text_generator.download_model')
    def test_image_to_text_success_with_florence_model(self, mock_download_model, mock_sleep):
        """Test successful image to text extraction with Florence model"""
        # Setup
        mock_model = MagicMock()
        mock_model.extract.return_value = "A detailed image description"
        mock_download_model.return_value = mock_model

        # Execute
        result = image_to_text("/path/to/image.jpg", "Florence-2-base")

        # Assert
        assert result == "A detailed image description"
        mock_download_model.assert_called_once_with("Florence-2-base")
        mock_model.extract.assert_called_once_with("/path/to/image.jpg")
        # Florence model should NOT sleep
        mock_sleep.assert_not_called()

    @patch('image_to_text_generator.time.sleep')
    @patch('image_to_text_generator.download_model')
    def test_image_to_text_success_with_moondream(self, mock_download_model, mock_sleep):
        """Test successful image to text extraction with Moondream"""
        # Setup
        mock_model = MagicMock()
        mock_model.extract.return_value = "Moondream caption"
        mock_download_model.return_value = mock_model

        # Execute
        result = image_to_text("/app/memes/test.jpg", "moondream2")

        # Assert
        assert result == "Moondream caption"
        mock_download_model.assert_called_once_with("moondream2")
        mock_model.extract.assert_called_once_with("/app/memes/test.jpg")
        mock_sleep.assert_not_called()

    @patch('image_to_text_generator.download_model')
    def test_image_to_text_download_failure(self, mock_download_model):
        """Test image_to_text when model download fails"""
        # Setup
        mock_download_model.side_effect = Exception("Model download failed")

        # Execute & Assert
        with pytest.raises(Exception, match="Model download failed"):
            image_to_text("/path/to/image.jpg", "Florence-2-base")

    @patch('image_to_text_generator.download_model')
    def test_image_to_text_extraction_failure(self, mock_download_model):
        """Test image_to_text when extraction fails"""
        # Setup
        mock_model = MagicMock()
        mock_model.extract.side_effect = Exception("Image extraction failed")
        mock_download_model.return_value = mock_model

        # Execute & Assert
        with pytest.raises(Exception, match="Image extraction failed"):
            image_to_text("/path/to/image.jpg", "test")

    @patch('image_to_text_generator.download_model')
    def test_image_to_text_with_empty_description(self, mock_download_model):
        """Test image_to_text returns empty string when model returns empty"""
        # Setup
        mock_model = MagicMock()
        mock_model.extract.return_value = ""
        mock_download_model.return_value = mock_model

        # Execute
        result = image_to_text("/path/to/image.jpg", "Florence-2-base")

        # Assert
        assert result == ""

    @patch('image_to_text_generator.download_model')
    def test_image_to_text_preserves_whitespace(self, mock_download_model):
        """Test image_to_text preserves whitespace in description"""
        # Setup
        mock_model = MagicMock()
        mock_model.extract.return_value = "  Description with spaces  "
        mock_download_model.return_value = mock_model

        # Execute
        result = image_to_text("/path/to/image.jpg", "test")

        # Assert - should preserve whatever the model returns
        assert result == "  Description with spaces  "

    @patch('image_to_text_generator.time.sleep')
    @patch('image_to_text_generator.download_model')
    def test_image_to_text_with_different_image_paths(self, mock_download_model, mock_sleep):
        """Test image_to_text with various image paths"""
        # Setup
        mock_model = MagicMock()
        mock_model.extract.return_value = "Test description"
        mock_download_model.return_value = mock_model

        # Test different path formats
        paths = [
            "/app/public/memes/image1.jpg",
            "/full/path/to/image.png",
            "relative/path/image.gif",
            "/path/with spaces/image.jpg"
        ]

        for path in paths:
            mock_model.extract.reset_mock()

            # Execute
            result = image_to_text(path, "test")

            # Assert
            assert result == "Test description"
            mock_model.extract.assert_called_once_with(path)

    @patch('image_to_text_generator.time.sleep')
    @patch('image_to_text_generator.download_model')
    def test_image_to_text_test_model_sleep_duration(self, mock_download_model, mock_sleep):
        """Test that test model sleeps for exactly 5 seconds"""
        # Setup
        mock_model = MagicMock()
        mock_model.extract.return_value = "Test"
        mock_download_model.return_value = mock_model

        # Execute
        image_to_text("/path/to/image.jpg", "test")

        # Assert - verify sleep called with 5 seconds exactly
        mock_sleep.assert_called_once()
        assert mock_sleep.call_args[0][0] == 5

    @patch('image_to_text_generator.download_model')
    def test_image_to_text_with_all_available_models(self, mock_download_model):
        """Test image_to_text with all available model names"""
        # Setup
        mock_model = MagicMock()
        mock_model.extract.return_value = "Description"
        mock_download_model.return_value = mock_model

        models = [
            "test",
            "Florence-2-base",
            "Florence-2-large",
            "SmolVLM-256M-Instruct",
            "SmolVLM-500M-Instruct",
            "moondream2"
        ]

        for model_name in models:
            mock_download_model.reset_mock()
            mock_model.extract.reset_mock()

            # Execute
            result = image_to_text("/test.jpg", model_name)

            # Assert
            assert result == "Description"
            mock_download_model.assert_called_once_with(model_name)
            mock_model.extract.assert_called_once()
