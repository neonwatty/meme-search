# Phase 1: SmolVLM INT8 Quantization Implementation

**Duration**: 2 days
**Risk Level**: Low (well-documented, proven approach)
**Dependencies**: None (uses existing moondream2-int8 pattern)

## Objectives

Add INT8 quantized variants for both SmolVLM models:
1. SmolVLM-256M-Instruct-int8 (~256MB, down from ~500MB)
2. SmolVLM-500M-Instruct-int8 (~500MB, down from ~1.8GB)

## Why SmolVLM First?

- **Official support**: HuggingFace docs explicitly show INT8 examples
- **Proven benefits**: 1.7x TTFT improvement, 1.4x throughput increase
- **No known issues**: Unlike Florence-2, no sensitivity warnings
- **Same architecture**: Both 256M and 500M use same quantization approach

## Technical Details

### Model IDs (Same as Base Models)
- `HuggingFaceTB/SmolVLM-256M-Instruct`
- `HuggingFaceTB/SmolVLM-500M-Instruct`

### Quantization Configuration
```python
from transformers import BitsAndBytesConfig

quantization_config = BitsAndBytesConfig(
    load_in_8bit=True,
    llm_int8_threshold=6.0,
)
```

### Key Differences from Base SmolVLM

**Base SmolVLM Pattern** (current code, line 326):
```python
self.model = AutoModelForVision2Seq.from_pretrained(
    "HuggingFaceTB/SmolVLM-256M-Instruct",
    torch_dtype=torch.bfloat16,  # ← Explicit dtype
    _attn_implementation="eager"
).to(device)  # ← Manual device placement
```

**Quantized SmolVLM Pattern** (to implement):
```python
quantization_config = BitsAndBytesConfig(
    load_in_8bit=True,
    llm_int8_threshold=6.0,
)

self.model = AutoModelForVision2Seq.from_pretrained(
    "HuggingFaceTB/SmolVLM-256M-Instruct",
    quantization_config=quantization_config,  # ← Add quantization
    _attn_implementation="eager",  # ← Keep same
    device_map="auto",  # ← Auto placement, not .to(device)
)
# Note: No torch_dtype needed - quantization config handles it
# Note: No .to(device) call - incompatible with load_in_8bit=True
```

## Implementation Steps

### Step 1.1: Add SmolVLM256QuantizedImageToText Class

**File**: `meme_search/image_to_text_generator/app/model_init.py`

**Location**: After `SmolVLM256ImageToText` class (after line 382)

**Code Template** (following moondream2-int8 pattern):

```python
class SmolVLM256QuantizedImageToText:
    """
    INT8 quantized SmolVLM-256M using BitsAndBytes for memory-constrained hardware.

    Reduces memory footprint from ~500MB (BF16) to ~256MB (INT8) with minimal quality loss.
    Ideal for CPU-only machines or low-memory environments.

    Technical notes:
    - Uses BitsAndBytesConfig with load_in_8bit=True
    - Requires device_map="auto" (cannot call .to(device) after loading)
    - Typically achieves 49% memory reduction vs BF16
    - Quality degradation: 0-5% (minimal, proven in official docs)
    - Performance: 1.7x faster TTFT, 1.4x higher throughput
    """

    def __init__(self, model_id, revision):
        self.model_id = model_id
        self.revision = revision
        self.model = None
        self.processor = None
        self.downloaded = False

    def download(self):
        try:
            from transformers import BitsAndBytesConfig
            import bitsandbytes  # noqa: F401 - Check availability

            logging.info("INFO: starting download or loading of quantized SmolVLM-256M (INT8)...")

            # Configure INT8 quantization
            quantization_config = BitsAndBytesConfig(
                load_in_8bit=True,
                llm_int8_threshold=6.0,  # Good default for INT8
            )

            # Load processor
            self.processor = AutoProcessor.from_pretrained(self.model_id)

            # Load model with quantization
            # IMPORTANT: Use device_map="auto", NOT .to(device)
            # BitsAndBytes handles device placement automatically
            self.model = AutoModelForVision2Seq.from_pretrained(
                self.model_id,
                quantization_config=quantization_config,
                device_map="auto",  # Let BitsAndBytes manage device
                _attn_implementation="eager",  # SmolVLM-specific setting
            )

            logging.info("INFO: ... complete (INT8 quantized)")
            self.downloaded = True
            return None

        except ImportError as e:
            error_msg = f"ERROR: BitsAndBytes not installed. Required for INT8 quantization: {e}"
            logging.error(error_msg)
            raise ImportError(error_msg)
        except Exception as e:
            error_msg = f"ERROR: Failed to load quantized SmolVLM-256M: {e}"
            logging.error(error_msg)
            raise e

    def extract(self, image_path):
        # Check if downloaded
        if self.downloaded is False:
            message = "INFO: model not downloaded, downloading..."
            logging.info(message)
            self.download()
            logging.info("INFO: model downloaded, starting image processing")

        # Load image
        image = Image.open(image_path)
        logging.info(f"DONE: image loaded, starting generation --> {image_path}")

        # Process image (same API as base SmolVLM-256M)
        logging.info(f"INFO: starting image to text extraction for image --> {image_path}")

        # Create chat messages (SmolVLM uses chat template)
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image"},
                    {"type": "text", "text": "Can you describe this image?"},
                ],
            }
        ]

        # Apply chat template
        prompt = self.processor.apply_chat_template(messages, add_generation_prompt=True)

        # Prepare inputs
        inputs = self.processor(text=prompt, images=[image], return_tensors="pt")
        inputs = inputs.to(self.model.device)  # Use model's device (auto-managed)

        # Generate
        generated_ids = self.model.generate(**inputs, max_new_tokens=500)
        generated_texts = self.processor.batch_decode(
            generated_ids, skip_special_tokens=True
        )

        # Extract answer (remove prompt)
        caption = generated_texts[0].split("Assistant:")[-1].strip()

        logging.info("INFO: ... done")
        return caption
```

### Step 1.2: Add SmolVLM500QuantizedImageToText Class

**File**: `meme_search/image_to_text_generator/app/model_init.py`

**Location**: After `SmolVLM500ImageToText` class (after line 468)

**Code**: Same as Step 1.1 but with:
- Class name: `SmolVLM500QuantizedImageToText`
- Docstring: Change "~500MB (BF16) to ~256MB" → "~1.8GB (BF16) to ~500MB"
- Docstring: Change "49% memory reduction" → "72% memory reduction"

### Step 1.3: Update Constants

**File**: `meme_search/image_to_text_generator/app/constants.py`

**Change** (line 12-21):
```python
# Before
available_models = [
    "test",
    default_model,
    "Florence-2-large",
    "SmolVLM-256M-Instruct",
    "SmolVLM-500M-Instruct",
    "moondream2",
    "moondream2-int8",
]

# After
available_models = [
    "test",
    default_model,
    "Florence-2-large",
    "SmolVLM-256M-Instruct",
    "SmolVLM-256M-Instruct-int8",  # INT8 quantized for memory efficiency (~256MB vs ~500MB)
    "SmolVLM-500M-Instruct",
    "SmolVLM-500M-Instruct-int8",  # INT8 quantized for memory efficiency (~500MB vs ~1.8GB)
    "moondream2",
    "moondream2-int8",
]
```

### Step 1.4: Update Model Selector

**File**: `meme_search/image_to_text_generator/app/model_init.py`

**Location**: In `model_selector()` function (after line 504)

**Add** (after the SmolVLM-500M case, before moondream2):
```python
    elif model_name == "SmolVLM-256M-Instruct-int8":
        current_model = SmolVLM256QuantizedImageToText(
            model_id="HuggingFaceTB/SmolVLM-256M-Instruct",
            revision="2024-08-26",  # Same revision as base model
        )
        return current_model
    elif model_name == "SmolVLM-500M-Instruct-int8":
        current_model = SmolVLM500QuantizedImageToText(
            model_id="HuggingFaceTB/SmolVLM-500M-Instruct",
            revision="2024-08-26",  # Same revision as base model
        )
        return current_model
```

### Step 1.5: Add Unit Tests

**File**: `meme_search/image_to_text_generator/tests/unit/test_model_init.py`

**Location**: After `TestMoondreamQuantizedImageToText` class (after line 212)

**Add Two Test Classes**:

```python
class TestSmolVLM256QuantizedImageToText:
    """Test suite for SmolVLM-256M-Instruct INT8 quantized model"""

    def test_init(self):
        """Test SmolVLM-256M quantized initialization"""
        model = SmolVLM256QuantizedImageToText(
            model_id="HuggingFaceTB/SmolVLM-256M-Instruct", revision="2024-08-26"
        )
        assert model.model_id == "HuggingFaceTB/SmolVLM-256M-Instruct"
        assert model.revision == "2024-08-26"
        assert model.model is None
        assert model.processor is None
        assert model.downloaded is False

    @patch("transformers.BitsAndBytesConfig")
    @patch("model_init.AutoProcessor.from_pretrained")
    @patch("model_init.AutoModelForVision2Seq.from_pretrained")
    def test_download_with_quantization_config(self, mock_model, mock_processor, mock_config):
        """Test download with INT8 quantization configuration"""
        # Setup mocks
        mock_model_instance = MagicMock()
        mock_model.return_value = mock_model_instance
        mock_processor_instance = MagicMock()
        mock_processor.return_value = mock_processor_instance

        model = SmolVLM256QuantizedImageToText(
            model_id="HuggingFaceTB/SmolVLM-256M-Instruct", revision="2024-08-26"
        )

        # Execute
        result = model.download()

        # Assert
        assert result is None
        assert model.downloaded is True

        # Verify AutoProcessor was called
        mock_processor.assert_called_once_with("HuggingFaceTB/SmolVLM-256M-Instruct")

        # Verify model loading
        mock_model.assert_called_once()
        call_kwargs = mock_model.call_args[1]
        assert "quantization_config" in call_kwargs
        assert "device_map" in call_kwargs
        assert call_kwargs["device_map"] == "auto"
        assert "_attn_implementation" in call_kwargs
        assert call_kwargs["_attn_implementation"] == "eager"

        # Verify BitsAndBytesConfig was created
        mock_config.assert_called_once_with(
            load_in_8bit=True,
            llm_int8_threshold=6.0,
        )

    @patch("model_init.Image.open")
    @patch("transformers.BitsAndBytesConfig")
    @patch("model_init.AutoProcessor.from_pretrained")
    @patch("model_init.AutoModelForVision2Seq.from_pretrained")
    def test_extract_auto_downloads_if_needed(
        self, mock_model, mock_processor, mock_config, mock_image
    ):
        """Test extract triggers download if not already downloaded"""
        # Setup mocks
        mock_model_instance = MagicMock()
        mock_model_instance.device = "cuda"
        mock_model_instance.generate.return_value = [[1, 2, 3]]
        mock_model.return_value = mock_model_instance

        mock_processor_instance = MagicMock()
        mock_processor_instance.apply_chat_template.return_value = "template"
        mock_inputs = MagicMock()
        mock_inputs.to.return_value = mock_inputs
        mock_processor_instance.return_value = mock_inputs
        mock_processor_instance.batch_decode.return_value = [
            "Can you describe this image?Assistant: Test caption"
        ]
        mock_processor.return_value = mock_processor_instance

        mock_pil_image = MagicMock()
        mock_image.return_value = mock_pil_image

        model = SmolVLM256QuantizedImageToText(
            model_id="HuggingFaceTB/SmolVLM-256M-Instruct", revision="2024-08-26"
        )

        # Execute
        result = model.extract("test.jpg")

        # Assert
        assert result == "Test caption"
        assert model.downloaded is True

    @patch("model_init.Image.open")
    def test_extract_with_already_downloaded_model(self, mock_image):
        """Test extract with pre-downloaded model (no download call)"""
        # Setup mock image
        mock_pil_image = MagicMock()
        mock_image.return_value = mock_pil_image

        # Setup model as if already downloaded
        mock_model_instance = MagicMock()
        mock_model_instance.device = "cuda"
        mock_model_instance.generate.return_value = [[1, 2, 3]]

        mock_processor_instance = MagicMock()
        mock_processor_instance.apply_chat_template.return_value = "template"
        mock_inputs = MagicMock()
        mock_inputs.to.return_value = mock_inputs
        mock_processor_instance.return_value = mock_inputs
        mock_processor_instance.batch_decode.return_value = [
            "Can you describe this image?Assistant: Cached caption"
        ]

        model = SmolVLM256QuantizedImageToText(
            model_id="HuggingFaceTB/SmolVLM-256M-Instruct", revision="2024-08-26"
        )
        model.model = mock_model_instance
        model.processor = mock_processor_instance
        model.downloaded = True

        # Execute
        result = model.extract("test.jpg")

        # Assert
        assert result == "Cached caption"
        assert model.downloaded is True


class TestSmolVLM500QuantizedImageToText:
    """Test suite for SmolVLM-500M-Instruct INT8 quantized model"""

    def test_init(self):
        """Test SmolVLM-500M quantized initialization"""
        model = SmolVLM500QuantizedImageToText(
            model_id="HuggingFaceTB/SmolVLM-500M-Instruct", revision="2024-08-26"
        )
        assert model.model_id == "HuggingFaceTB/SmolVLM-500M-Instruct"
        assert model.revision == "2024-08-26"
        assert model.model is None
        assert model.processor is None
        assert model.downloaded is False

    @patch("transformers.BitsAndBytesConfig")
    @patch("model_init.AutoProcessor.from_pretrained")
    @patch("model_init.AutoModelForVision2Seq.from_pretrained")
    def test_download_with_quantization_config(self, mock_model, mock_processor, mock_config):
        """Test download with INT8 quantization configuration"""
        # Same structure as SmolVLM256QuantizedImageToText test
        mock_model_instance = MagicMock()
        mock_model.return_value = mock_model_instance
        mock_processor_instance = MagicMock()
        mock_processor.return_value = mock_processor_instance

        model = SmolVLM500QuantizedImageToText(
            model_id="HuggingFaceTB/SmolVLM-500M-Instruct", revision="2024-08-26"
        )

        result = model.download()

        assert result is None
        assert model.downloaded is True
        mock_processor.assert_called_once_with("HuggingFaceTB/SmolVLM-500M-Instruct")
        mock_config.assert_called_once_with(
            load_in_8bit=True,
            llm_int8_threshold=6.0,
        )

    # Add test_extract_auto_downloads_if_needed and test_extract_with_already_downloaded_model
    # (same structure as SmolVLM256QuantizedImageToText tests)
```

**Also update model_selector tests**:

```python
# In TestModelSelector class, add after moondream2-int8 test (line 520):

def test_model_selector_smolvlm_256m_int8(self):
    model = model_selector("SmolVLM-256M-Instruct-int8")
    assert isinstance(model, SmolVLM256QuantizedImageToText)
    assert model.model_id == "HuggingFaceTB/SmolVLM-256M-Instruct"
    assert model.revision == "2024-08-26"

def test_model_selector_smolvlm_500m_int8(self):
    model = model_selector("SmolVLM-500M-Instruct-int8")
    assert isinstance(model, SmolVLM500QuantizedImageToText)
    assert model.model_id == "HuggingFaceTB/SmolVLM-500M-Instruct"
    assert model.revision == "2024-08-26"
```

### Step 1.6: Update Rails Seeds

**File**: `meme_search/meme_search_app/db/seeds.rb`

**Change** (lines 100-113):

```ruby
# Update arrays to include new quantized models
available_models = [
  "Florence-2-base",
  "Florence-2-large",
  "SmolVLM-256M-Instruct",
  "SmolVLM-256M-Instruct-int8",  # NEW
  "SmolVLM-500M-Instruct",
  "SmolVLM-500M-Instruct-int8",  # NEW
  "moondream2",
  "moondream2-int8"
]

resources = [
  "https://huggingface.co/microsoft/Florence-2-base",
  "https://huggingface.co/microsoft/Florence-2-large",
  "https://huggingface.co/collections/HuggingFaceTB/smolvlm-256m-and-500m-6791fafc5bb0ab8acc960fb0",
  "https://huggingface.co/collections/HuggingFaceTB/smolvlm-256m-and-500m-6791fafc5bb0ab8acc960fb0",  # Same as base
  "https://huggingface.co/collections/HuggingFaceTB/smolvlm-256m-and-500m-6791fafc5bb0ab8acc960fb0",
  "https://huggingface.co/collections/HuggingFaceTB/smolvlm-256m-and-500m-6791fafc5bb0ab8acc960fb0",  # Same as base
  "https://huggingface.co/vikhyatk/moondream2",
  "https://huggingface.co/vikhyatk/moondream2"
]

descriptions = [
  'A popular series of small vision language models built by Microsoft, including a 250 Million (base) and a 700 Million (large) parameter variant.',
  'The 700 Million parameter vision language model variant of the Florence-2 series.',
  'A 256 Million parameter vision language model built by Hugging Face.',
  'INT8 quantized version of SmolVLM-256M (256M params) for memory-constrained hardware. Reduces memory from ~500MB to ~256MB (49% reduction) with minimal quality loss. Proven 1.7x faster TTFT and 1.4x higher throughput. Ideal for CPU-only or limited GPU memory.',
  'A 500 Million parameter vision language model built by Hugging Face.',
  'INT8 quantized version of SmolVLM-500M (500M params) for memory-constrained hardware. Reduces memory from ~1.8GB to ~500MB (72% reduction) with minimal quality loss. Proven 1.7x faster TTFT and 1.4x higher throughput. Best for CPU deployment with quality requirements.',
  'A 2 Billion parameter vision language model used for image captioning / extracting image text.',
  'INT8 quantized version of Moondream2 (2B params) for memory-constrained hardware. Reduces memory from ~5GB to ~1.5-2GB with minimal quality loss. Ideal for CPU-only machines.'
]
```

**File**: `meme_search/meme_search_app/db/seeds/test_seed.rb`

**Add** (after moondream2-int8 entry, around line 133):

```ruby
ImageToText.create!(
  name: "SmolVLM-256M-Instruct-int8",
  resource: "https://huggingface.co/collections/HuggingFaceTB/smolvlm-256m-and-500m-6791fafc5bb0ab8acc960fb0",
  description: "INT8 quantized SmolVLM-256M. ~256MB memory (49% reduction). Proven performance boost.",
  current: false
)

ImageToText.create!(
  name: "SmolVLM-500M-Instruct-int8",
  resource: "https://huggingface.co/collections/HuggingFaceTB/smolvlm-256m-and-500m-6791fafc5bb0ab8acc960fb0",
  description: "INT8 quantized SmolVLM-500M. ~500MB memory (72% reduction). Best CPU option for quality.",
  current: false
)
```

## Testing Checklist

### Unit Tests
- [ ] Run `pytest tests/unit/test_model_init.py::TestSmolVLM256QuantizedImageToText -v`
- [ ] Run `pytest tests/unit/test_model_init.py::TestSmolVLM500QuantizedImageToText -v`
- [ ] Run `pytest tests/unit/test_model_init.py::TestModelSelector -v`
- [ ] Run full suite: `pytest tests/unit/test_model_init.py -v`
- [ ] Verify coverage maintained: `pytest tests/unit/ --cov=app --cov-report=html`

### Integration Tests
- [ ] Run `pytest tests/integration/test_app.py -v` (should pass unchanged)

### Manual Testing
```bash
# Test SmolVLM-256M-INT8
cd meme_search/image_to_text_generator
mise exec -- python -c "
from app.model_init import model_selector
model = model_selector('SmolVLM-256M-Instruct-int8')
print(f'Model loaded: {model.__class__.__name__}')
caption = model.extract('public/memes/test/all the fucks.jpg')
print(f'Caption: {caption}')
"

# Test SmolVLM-500M-INT8
mise exec -- python -c "
from app.model_init import model_selector
model = model_selector('SmolVLM-500M-Instruct-int8')
print(f'Model loaded: {model.__class__.__name__}')
caption = model.extract('public/memes/test/all the fucks.jpg')
print(f'Caption: {caption}')
"
```

### Memory Verification
```bash
# Monitor memory during inference
docker stats --no-stream

# Or use Python psutil
mise exec -- python -c "
import psutil
from app.model_init import model_selector

# Baseline
baseline = psutil.Process().memory_info().rss / 1024 / 1024
print(f'Baseline memory: {baseline:.2f} MB')

# Load INT8 model
model = model_selector('SmolVLM-256M-Instruct-int8')
model.download()
after_load = psutil.Process().memory_info().rss / 1024 / 1024
print(f'After load: {after_load:.2f} MB')
print(f'Model memory: {after_load - baseline:.2f} MB')
"
```

## Expected Outcomes

### Test Results
- **Unit tests**: 8 new tests (4 per model × 2 models)
- **Total tests**: 96 → 104 tests
- **Coverage**: Maintain >80%
- **All tests**: PASS

### Memory Measurements
- **SmolVLM-256M-int8**: ~256MB (vs ~500MB base) = 49% reduction
- **SmolVLM-500M-int8**: ~500MB (vs ~1.8GB base) = 72% reduction

### Quality Check
Compare captions on 4 test images:
1. all the fucks.jpg
2. ants.jpg
3. its happening.gif
4. regrettable.jpeg

Expect ≥99% similarity (proven in official docs)

## Completion Criteria

- [ ] Both quantized classes implemented
- [ ] Constants and model_selector updated
- [ ] Unit tests added and passing
- [ ] Rails seeds updated
- [ ] Manual testing confirms memory savings
- [ ] Quality validation passes (≥95% caption similarity)
- [ ] Documentation updated (code comments)

## Next Phase

After Phase 1 completion, proceed to **Phase 2: Florence-2 INT4 Quantization** (note: INT4, not INT8, per official recommendations).
