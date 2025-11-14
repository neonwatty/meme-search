import pytest
from unittest.mock import Mock, patch, MagicMock
import sys
from pathlib import Path

# Add app directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "app"))

from model_init import (
    TestImageToText,
    MoondreamImageToText,
    MoondreamQuantizedImageToText,
    Florence2BaseImageToText,
    Florence2LargeImageToText,
    SmolVLM256ImageToText,
    SmolVLM500ImageToText,
    model_selector
)


class TestTestImageToText:
    """Test suite for TestImageToText model (test/mock model)"""

    def test_init(self):
        """Test TestImageToText initialization"""
        model = TestImageToText()
        assert model is not None

    def test_download_returns_none(self):
        """Test download method returns None"""
        model = TestImageToText()
        result = model.download()
        assert result is None

    def test_extract_returns_deterministic_output(self):
        """Test extract method returns deterministic output based on filename"""
        model = TestImageToText()
        result = model.extract("/path/to/fake_path.jpg")
        assert result == "Test description for fake_path"

        # Test with different filename
        result2 = model.extract("/another/path/image123.png")
        assert result2 == "Test description for image123"


class TestMoondreamImageToText:
    """Test suite for MoondreamImageToText model"""

    def test_init(self):
        """Test Moondream initialization"""
        model = MoondreamImageToText(model_id="vikhyatk/moondream2", revision="2025-01-09")

        assert model.model_id == "vikhyatk/moondream2"
        assert model.revision == "2025-01-09"
        assert model.model is None
        assert model.tokenizer is None
        assert model.downloaded is False

    @patch('model_init.AutoModelForCausalLM.from_pretrained')
    def test_download_success(self, mock_model):
        """Test successful model download"""
        # Setup
        mock_model_instance = MagicMock()
        mock_model_instance.to.return_value = mock_model_instance
        mock_model.return_value = mock_model_instance

        model = MoondreamImageToText(model_id="vikhyatk/moondream2", revision="2025-01-09")

        # Execute
        result = model.download()

        # Assert
        assert result is None
        assert model.downloaded is True
        mock_model.assert_called_once_with(
            "vikhyatk/moondream2",
            revision="2025-01-09",
            trust_remote_code=True
        )

    @patch('model_init.Image.open')
    @patch('model_init.AutoModelForCausalLM.from_pretrained')
    def test_extract_auto_downloads_if_needed(self, mock_model, mock_image):
        """Test extract downloads model if not already downloaded"""
        # Setup
        mock_model_instance = MagicMock()
        mock_model_instance.to.return_value = mock_model_instance
        mock_model_instance.caption.return_value = {"caption": "Test caption"}
        mock_model.return_value = mock_model_instance

        mock_pil_image = MagicMock()
        mock_image.return_value = mock_pil_image

        model = MoondreamImageToText(model_id="vikhyatk/moondream2", revision="2025-01-09")

        # Execute
        result = model.extract("test.jpg")

        # Assert
        assert result == "Test caption"
        assert model.downloaded is True
        mock_model.assert_called_once()
        mock_image.assert_called_once_with("test.jpg")

    @patch('model_init.Image.open')
    def test_extract_with_already_downloaded_model(self, mock_image):
        """Test extract with pre-downloaded model"""
        # Setup
        mock_pil_image = MagicMock()
        mock_image.return_value = mock_pil_image

        mock_model_instance = MagicMock()
        mock_model_instance.caption.return_value = {"caption": "  Caption with spaces  "}

        model = MoondreamImageToText(model_id="vikhyatk/moondream2", revision="2025-01-09")
        model.model = mock_model_instance
        model.downloaded = True

        # Execute
        result = model.extract("test.jpg")

        # Assert - should strip whitespace
        assert result == "Caption with spaces"
        mock_image.assert_called_once_with("test.jpg")


class TestMoondreamQuantizedImageToText:
    """Test suite for MoondreamQuantizedImageToText model (INT8 quantized)"""

    def test_init(self):
        """Test quantized Moondream initialization"""
        model = MoondreamQuantizedImageToText(model_id="vikhyatk/moondream2", revision="2025-01-09")

        assert model.model_id == "vikhyatk/moondream2"
        assert model.revision == "2025-01-09"
        assert model.model is None
        assert model.downloaded is False

    @patch('transformers.BitsAndBytesConfig')
    @patch('model_init.AutoModelForCausalLM.from_pretrained')
    def test_download_with_quantization_config(self, mock_model, mock_config):
        """Test download with INT8 quantization configuration"""
        # Setup
        mock_model_instance = MagicMock()
        mock_model.return_value = mock_model_instance

        model = MoondreamQuantizedImageToText(model_id="vikhyatk/moondream2", revision="2025-01-09")

        # Execute
        result = model.download()

        # Assert
        assert result is None
        assert model.downloaded is True
        mock_model.assert_called_once()

        # Verify quantization config was passed
        call_kwargs = mock_model.call_args[1]
        assert "quantization_config" in call_kwargs
        assert "device_map" in call_kwargs
        assert call_kwargs["device_map"] == "auto"
        assert call_kwargs["trust_remote_code"] is True
        # Verify BitsAndBytesConfig was created
        mock_config.assert_called_once_with(
            load_in_8bit=True,
            llm_int8_threshold=6.0,
        )

    @patch('model_init.Image.open')
    @patch('transformers.BitsAndBytesConfig')
    @patch('model_init.AutoModelForCausalLM.from_pretrained')
    def test_extract_auto_downloads_if_needed(self, mock_model, mock_config, mock_image):
        """Test extract downloads quantized model if not already downloaded"""
        # Setup
        mock_model_instance = MagicMock()
        mock_model_instance.caption.return_value = {"caption": "Quantized test caption"}
        mock_model.return_value = mock_model_instance

        mock_pil_image = MagicMock()
        mock_image.return_value = mock_pil_image

        model = MoondreamQuantizedImageToText(model_id="vikhyatk/moondream2", revision="2025-01-09")

        # Execute
        result = model.extract("test.jpg")

        # Assert
        assert result == "Quantized test caption"
        assert model.downloaded is True
        mock_model_instance.caption.assert_called_once()

    @patch('model_init.Image.open')
    def test_extract_with_already_downloaded_model(self, mock_image):
        """Test extract uses already downloaded quantized model"""
        # Setup
        mock_pil_image = MagicMock()
        mock_image.return_value = mock_pil_image

        mock_model_instance = MagicMock()
        mock_model_instance.caption.return_value = {"caption": "Cached quantized caption"}

        model = MoondreamQuantizedImageToText(model_id="vikhyatk/moondream2", revision="2025-01-09")
        model.model = mock_model_instance
        model.downloaded = True

        # Execute
        result = model.extract("test.jpg")

        # Assert
        assert result == "Cached quantized caption"
        mock_model_instance.caption.assert_called_once_with(mock_pil_image, length="short")


class TestFlorence2BaseImageToText:
    """Test suite for Florence2BaseImageToText model"""

    def test_init(self):
        """Test Florence-2-base initialization"""
        model = Florence2BaseImageToText(model_id="microsoft/Florence-2-base", revision="2024-08-26")

        assert model.model_id == "microsoft/Florence-2-base"
        assert model.revision == "2024-08-26"
        assert model.model is None
        assert model.processor is None
        assert model.downloaded is False

    @patch('model_init.AutoProcessor.from_pretrained')
    @patch('model_init.AutoModelForCausalLM.from_pretrained')
    def test_download_success(self, mock_model, mock_processor):
        """Test successful model download"""
        # Setup
        mock_model_instance = MagicMock()
        mock_model_instance.to.return_value = mock_model_instance
        mock_model.return_value = mock_model_instance

        mock_processor_instance = MagicMock()
        mock_processor.return_value = mock_processor_instance

        model = Florence2BaseImageToText(model_id="microsoft/Florence-2-base", revision="2024-08-26")

        # Execute
        result = model.download()

        # Assert
        assert result is None
        assert model.downloaded is True
        mock_model.assert_called_once()
        mock_processor.assert_called_once()

    @patch('model_init.Image.open')
    @patch('model_init.AutoProcessor.from_pretrained')
    @patch('model_init.AutoModelForCausalLM.from_pretrained')
    def test_extract_success_with_detailed_caption(self, mock_model, mock_processor, mock_image):
        """Test extract returns detailed caption"""
        # Setup mock image
        mock_pil_image = MagicMock()
        mock_pil_image.width = 800
        mock_pil_image.height = 600
        mock_image.return_value = mock_pil_image

        # Setup mock processor
        mock_processor_instance = MagicMock()
        mock_inputs = {"input_ids": MagicMock(), "pixel_values": MagicMock()}
        mock_inputs_with_to = MagicMock()
        mock_inputs_with_to.__getitem__ = lambda self, key: mock_inputs[key]

        mock_processor_instance.return_value = mock_inputs_with_to
        mock_processor_instance.batch_decode.return_value = ["generated text"]
        mock_processor_instance.post_process_generation.return_value = {
            '<DETAILED_CAPTION>': 'A detailed caption of the image'
        }
        mock_processor.return_value = mock_processor_instance

        # Setup mock model
        mock_model_instance = MagicMock()
        mock_model_instance.to.return_value = mock_model_instance
        mock_model_instance.generate.return_value = [1, 2, 3]  # Mock generated IDs
        mock_model.return_value = mock_model_instance

        model = Florence2BaseImageToText(model_id="microsoft/Florence-2-base", revision="2024-08-26")

        # Execute
        result = model.extract("test.jpg")

        # Assert
        assert result == 'A detailed caption of the image'
        assert model.downloaded is True

    @patch('model_init.Image.open')
    @patch('model_init.AutoProcessor.from_pretrained')
    @patch('model_init.AutoModelForCausalLM.from_pretrained')
    def test_extract_returns_empty_string_when_no_caption(self, mock_model, mock_processor, mock_image):
        """Test extract returns empty string when no caption in response"""
        # Setup
        mock_pil_image = MagicMock()
        mock_pil_image.width = 800
        mock_pil_image.height = 600
        mock_image.return_value = mock_pil_image

        mock_processor_instance = MagicMock()
        mock_inputs = {"input_ids": MagicMock(), "pixel_values": MagicMock()}
        mock_inputs_with_to = MagicMock()
        mock_inputs_with_to.__getitem__ = lambda self, key: mock_inputs[key]

        mock_processor_instance.return_value = mock_inputs_with_to
        mock_processor_instance.batch_decode.return_value = ["generated text"]
        # No DETAILED_CAPTION key
        mock_processor_instance.post_process_generation.return_value = {}
        mock_processor.return_value = mock_processor_instance

        mock_model_instance = MagicMock()
        mock_model_instance.to.return_value = mock_model_instance
        mock_model_instance.generate.return_value = [1, 2, 3]
        mock_model.return_value = mock_model_instance

        model = Florence2BaseImageToText(model_id="microsoft/Florence-2-base", revision="2024-08-26")

        # Execute
        result = model.extract("test.jpg")

        # Assert
        assert result == ""


class TestFlorence2LargeImageToText:
    """Test suite for Florence2LargeImageToText model"""

    def test_init(self):
        """Test Florence-2-large initialization"""
        model = Florence2LargeImageToText(model_id="microsoft/Florence-2-large", revision="2024-08-26")

        assert model.model_id == "microsoft/Florence-2-large"
        assert model.revision == "2024-08-26"
        assert model.model is None
        assert model.processor is None
        assert model.downloaded is False

    @patch('model_init.AutoProcessor.from_pretrained')
    @patch('model_init.AutoModelForCausalLM.from_pretrained')
    def test_download_success(self, mock_model, mock_processor):
        """Test successful model download"""
        # Setup
        mock_model_instance = MagicMock()
        mock_model_instance.to.return_value = mock_model_instance
        mock_model.return_value = mock_model_instance

        mock_processor_instance = MagicMock()
        mock_processor.return_value = mock_processor_instance

        model = Florence2LargeImageToText(model_id="microsoft/Florence-2-large", revision="2024-08-26")

        # Execute
        result = model.download()

        # Assert
        assert result is None
        assert model.downloaded is True
        # Just verify it was called with the model name, don't check exact torch_dtype
        mock_model.assert_called_once()
        call_args = mock_model.call_args
        assert call_args[0][0] == "microsoft/Florence-2-large"
        assert call_args[1]["trust_remote_code"] is True


class TestSmolVLM256ImageToText:
    """Test suite for SmolVLM256ImageToText model"""

    def test_init(self):
        """Test SmolVLM-256M initialization"""
        model = SmolVLM256ImageToText(model_id="HuggingFaceTB/SmolVLM-256M-Instruct", revision="2024-08-26")

        assert model.model_id == "HuggingFaceTB/SmolVLM-256M-Instruct"
        assert model.revision == "2024-08-26"
        assert model.model is None
        assert model.processor is None
        assert model.downloaded is False

    @patch('model_init.AutoProcessor.from_pretrained')
    @patch('model_init.AutoModelForVision2Seq.from_pretrained')
    def test_download_success(self, mock_model, mock_processor):
        """Test successful model download"""
        # Setup
        mock_model_instance = MagicMock()
        mock_model_instance.to.return_value = mock_model_instance
        mock_model.return_value = mock_model_instance

        mock_processor_instance = MagicMock()
        mock_processor.return_value = mock_processor_instance

        model = SmolVLM256ImageToText(model_id="HuggingFaceTB/SmolVLM-256M-Instruct", revision="2024-08-26")

        # Execute
        result = model.download()

        # Assert
        assert result is None
        assert model.downloaded is True
        mock_model.assert_called_once()
        mock_processor.assert_called_once()

    @patch('model_init.Image.open')
    @patch('model_init.AutoProcessor.from_pretrained')
    @patch('model_init.AutoModelForVision2Seq.from_pretrained')
    def test_extract_cleans_output_text(self, mock_model, mock_processor, mock_image):
        """Test extract cleans up output text properly"""
        # Setup
        mock_pil_image = MagicMock()
        mock_image.return_value = mock_pil_image

        mock_processor_instance = MagicMock()
        mock_processor_instance.apply_chat_template.return_value = "template"
        mock_inputs = MagicMock()
        mock_inputs.to.return_value = mock_inputs
        mock_processor_instance.return_value = mock_inputs
        mock_processor_instance.batch_decode.return_value = [
            "Can you describe this image?Assistant: This is a test image### Analysis and Description: extra text"
        ]
        mock_processor.return_value = mock_processor_instance

        mock_model_instance = MagicMock()
        mock_model_instance.to.return_value = mock_model_instance
        mock_model_instance.generate.return_value = [1, 2, 3]
        mock_model.return_value = mock_model_instance

        model = SmolVLM256ImageToText(model_id="HuggingFaceTB/SmolVLM-256M-Instruct", revision="2024-08-26")

        # Execute
        result = model.extract("test.jpg")

        # Assert - should clean up all the prompt/analysis text
        assert result == "This is a test image"
        assert model.downloaded is True


class TestSmolVLM500ImageToText:
    """Test suite for SmolVLM500ImageToText model"""

    def test_init(self):
        """Test SmolVLM-500M initialization"""
        model = SmolVLM500ImageToText(model_id="HuggingFaceTB/SmolVLM-500M-Instruct", revision="2024-08-26")

        assert model.model_id == "HuggingFaceTB/SmolVLM-500M-Instruct"
        assert model.revision == "2024-08-26"
        assert model.model is None
        assert model.processor is None
        assert model.downloaded is False

    @patch('model_init.AutoProcessor.from_pretrained')
    @patch('model_init.AutoModelForVision2Seq.from_pretrained')
    def test_download_success(self, mock_model, mock_processor):
        """Test successful model download"""
        # Setup
        mock_model_instance = MagicMock()
        mock_model_instance.to.return_value = mock_model_instance
        mock_model.return_value = mock_model_instance

        mock_processor_instance = MagicMock()
        mock_processor.return_value = mock_processor_instance

        model = SmolVLM500ImageToText(model_id="HuggingFaceTB/SmolVLM-500M-Instruct", revision="2024-08-26")

        # Execute
        result = model.download()

        # Assert
        assert result is None
        assert model.downloaded is True
        # Just verify it was called with the model name and attention implementation
        mock_model.assert_called_once()
        call_args = mock_model.call_args
        assert call_args[0][0] == "HuggingFaceTB/SmolVLM-500M-Instruct"
        assert call_args[1]["_attn_implementation"] == "eager"


class TestModelSelector:
    """Test suite for model_selector function"""

    def test_model_selector_test_model(self):
        """Test model_selector returns TestImageToText for 'test' model"""
        model = model_selector("test")
        assert isinstance(model, TestImageToText)

    def test_model_selector_florence_2_base(self):
        """Test model_selector returns Florence2BaseImageToText"""
        model = model_selector("Florence-2-base")
        assert isinstance(model, Florence2BaseImageToText)
        assert model.model_id == "microsoft/Florence-2-base"
        assert model.revision == "2024-08-26"

    def test_model_selector_florence_2_large(self):
        """Test model_selector returns Florence2LargeImageToText"""
        model = model_selector("Florence-2-large")
        assert isinstance(model, Florence2LargeImageToText)
        assert model.model_id == "microsoft/Florence-2-large"
        assert model.revision == "2024-08-26"

    def test_model_selector_smolvlm_256m(self):
        """Test model_selector returns SmolVLM256ImageToText"""
        model = model_selector("SmolVLM-256M-Instruct")
        assert isinstance(model, SmolVLM256ImageToText)
        assert model.model_id == "HuggingFaceTB/SmolVLM-256M-Instruct"

    def test_model_selector_smolvlm_500m(self):
        """Test model_selector returns SmolVLM500ImageToText"""
        model = model_selector("SmolVLM-500M-Instruct")
        assert isinstance(model, SmolVLM500ImageToText)
        assert model.model_id == "HuggingFaceTB/SmolVLM-500M-Instruct"

    def test_model_selector_moondream2(self):
        """Test model_selector returns MoondreamImageToText"""
        model = model_selector("moondream2")
        assert isinstance(model, MoondreamImageToText)
        assert model.model_id == "vikhyatk/moondream2"

    def test_model_selector_moondream2_int8(self):
        """Test model_selector returns MoondreamQuantizedImageToText for INT8 model"""
        model = model_selector("moondream2-int8")
        assert isinstance(model, MoondreamQuantizedImageToText)
        assert model.model_id == "vikhyatk/moondream2"
        assert model.revision == "2025-01-09"

    def test_model_selector_invalid_model_raises_value_error(self):
        """Test model_selector raises ValueError for invalid model name"""
        with pytest.raises(ValueError, match="model_name invalid-model not found in model_dict"):
            model_selector("invalid-model")

    def test_model_selector_empty_string_raises_value_error(self):
        """Test model_selector raises ValueError for empty string"""
        with pytest.raises(ValueError):
            model_selector("")

    def test_model_selector_none_raises_error(self):
        """Test model_selector raises error for None input"""
        with pytest.raises(Exception):
            model_selector(None)
