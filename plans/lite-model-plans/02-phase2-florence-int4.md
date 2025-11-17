# Phase 2: Florence-2 INT4 Quantization Implementation

**Duration**: 2 days
**Risk Level**: Medium (encoder sensitivity, needs quality validation)
**Dependencies**: Phase 1 complete (SmolVLM INT8 pattern established)

## ⚠️ IMPORTANT: INT4, NOT INT8

Based on official Florence-2 documentation:
- **Florence-2 models are "extremely sensitive to quantization settings, especially of the encoder"**
- **Official docs recommend 4-bit quantization**, not 8-bit
- 8-bit may produce gibberish on multi-GPU setups
- 4-bit provides better quality/size ratio for Florence architecture

## Objectives

Add INT4 quantized variants for both Florence-2 models:
1. Florence-2-base-int4 (~115MB, down from ~460MB) - 75% reduction
2. Florence-2-large-int4 (~385MB, down from ~1.54GB) - 75% reduction

## Technical Details

### Model IDs (Same as Base Models)
- `microsoft/Florence-2-base`
- `microsoft/Florence-2-large`

### INT4 Quantization Configuration (4-bit, NOT 8-bit)

```python
from transformers import BitsAndBytesConfig
import torch

quantization_config = BitsAndBytesConfig(
    load_in_4bit=True,  # ← 4-bit, not 8-bit
    bnb_4bit_compute_dtype=torch.bfloat16,  # Compute in BF16
    bnb_4bit_use_double_quant=True,  # Double quantization for extra compression
    bnb_4bit_quant_type="nf4"  # NormalFloat4 (better than standard INT4)
)
```

### Key Differences from SmolVLM INT8

**SmolVLM INT8**:
- `load_in_8bit=True`
- `llm_int8_threshold=6.0`
- 50% memory reduction

**Florence-2 INT4**:
- `load_in_4bit=True` ← Different!
- `bnb_4bit_compute_dtype=torch.bfloat16` ← Additional setting
- `bnb_4bit_use_double_quant=True` ← Double quantization
- `bnb_4bit_quant_type="nf4"` ← NormalFloat4 type
- 75% memory reduction

### Base Florence-2 Pattern (current code, line 202)

```python
self.model = AutoModelForCausalLM.from_pretrained(
    "microsoft/Florence-2-base",
    torch_dtype=torch_dtype,  # Global variable
    trust_remote_code=True
).to(device)  # Manual device placement
```

### Quantized Florence-2 Pattern (to implement)

```python
quantization_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4"
)

self.model = AutoModelForCausalLM.from_pretrained(
    "microsoft/Florence-2-base",
    quantization_config=quantization_config,  # ← Add quantization
    device_map="auto",  # ← Auto placement, not .to(device)
    trust_remote_code=True
)
# Note: No torch_dtype parameter - quantization config handles it
# Note: No .to(device) call - incompatible with load_in_4bit=True
```

## Implementation Steps

### Step 2.1: Add Florence2BaseQuantizedImageToText Class

**File**: `meme_search/image_to_text_generator/app/model_init.py`

**Location**: After `Florence2BaseImageToText` class (after line 236)

**Code Template**:

```python
class Florence2BaseQuantizedImageToText:
    """
    INT4 quantized Florence-2-base using BitsAndBytes for memory-constrained hardware.

    Reduces memory footprint from ~460MB (FP16) to ~115MB (INT4) with minimal quality loss.
    Uses 4-bit NormalFloat quantization as recommended by Microsoft for Florence-2 models.

    Technical notes:
    - Uses BitsAndBytesConfig with load_in_4bit=True (NOT 8-bit)
    - Florence-2 encoder is sensitive to quantization - 4-bit preferred over 8-bit
    - Requires device_map="auto" (cannot call .to(device) after loading)
    - Typically achieves 75% memory reduction vs FP16
    - Quality degradation: 5-10% (needs validation)
    - Uses NF4 (NormalFloat4) for better quality than standard INT4
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
            import torch

            logging.info("INFO: starting download or loading of quantized Florence-2-base (INT4)...")

            # Configure INT4 quantization (recommended for Florence-2)
            quantization_config = BitsAndBytesConfig(
                load_in_4bit=True,  # 4-bit quantization
                bnb_4bit_compute_dtype=torch.bfloat16,  # Compute in BF16
                bnb_4bit_use_double_quant=True,  # Double quantization
                bnb_4bit_quant_type="nf4"  # NormalFloat4 (better quality)
            )

            # Load model with quantization
            # IMPORTANT: Use device_map="auto", NOT .to(device)
            # Florence-2 encoder is sensitive to quantization settings
            self.model = AutoModelForCausalLM.from_pretrained(
                "microsoft/Florence-2-base",
                quantization_config=quantization_config,
                device_map="auto",  # Let BitsAndBytes manage device
                trust_remote_code=True
            )

            # Load processor
            self.processor = AutoProcessor.from_pretrained(
                "microsoft/Florence-2-base",
                trust_remote_code=True
            )

            logging.info("INFO: ... complete (INT4 quantized with NF4)")
            self.downloaded = True
            return None

        except ImportError as e:
            error_msg = f"ERROR: BitsAndBytes not installed. Required for INT4 quantization: {e}"
            logging.error(error_msg)
            raise ImportError(error_msg)
        except Exception as e:
            error_msg = f"ERROR: Failed to load quantized Florence-2-base: {e}"
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

        # Process image (same API as base Florence-2-base)
        logging.info(f"INFO: starting image to text extraction for image --> {image_path}")

        task_prompt = "<DETAILED_CAPTION>"
        prompt = task_prompt

        # Prepare inputs
        inputs = self.processor(text=prompt, images=image, return_tensors="pt")
        inputs = inputs.to(self.model.device)  # Use model's device (auto-managed)

        # Generate with beam search (same as base Florence)
        generated_ids = self.model.generate(
            input_ids=inputs["input_ids"],
            pixel_values=inputs["pixel_values"],
            max_new_tokens=1024,
            early_stopping=False,
            do_sample=False,
            num_beams=3,
        )

        # Decode
        generated_text = self.processor.batch_decode(generated_ids, skip_special_tokens=False)[0]
        parsed_answer = self.processor.post_process_generation(
            generated_text, task=task_prompt, image_size=(image.width, image.height)
        )

        # Extract caption
        caption = parsed_answer["<DETAILED_CAPTION>"]

        logging.info("INFO: ... done")
        return caption
```

### Step 2.2: Add Florence2LargeQuantizedImageToText Class

**File**: `meme_search/image_to_text_generator/app/model_init.py`

**Location**: After `Florence2LargeImageToText` class (after line 296)

**Code**: Same as Step 2.1 but with:
- Class name: `Florence2LargeQuantizedImageToText`
- Model ID: `"microsoft/Florence-2-large"`
- Docstring: Change "~460MB (FP16) to ~115MB" → "~1.54GB (FP16) to ~385MB"
- All processor/model calls use `"microsoft/Florence-2-large"`

### Step 2.3: Update Constants

**File**: `meme_search/image_to_text_generator/app/constants.py`

**Change**:
```python
# After adding SmolVLM models in Phase 1
available_models = [
    "test",
    default_model,  # Florence-2-base
    "Florence-2-base-int4",  # INT4 quantized for ultra-low memory (~115MB vs ~460MB)
    "Florence-2-large",
    "Florence-2-large-int4",  # INT4 quantized for ultra-low memory (~385MB vs ~1.54GB)
    "SmolVLM-256M-Instruct",
    "SmolVLM-256M-Instruct-int8",
    "SmolVLM-500M-Instruct",
    "SmolVLM-500M-Instruct-int8",
    "moondream2",
    "moondream2-int8",
]
```

### Step 2.4: Update Model Selector

**File**: `meme_search/image_to_text_generator/app/model_init.py`

**Add** (in `model_selector()` function, after Florence-2-large case):
```python
    elif model_name == "Florence-2-base-int4":
        current_model = Florence2BaseQuantizedImageToText(
            model_id="microsoft/Florence-2-base",
            revision="2024-08-26",  # Same revision as base
        )
        return current_model
    elif model_name == "Florence-2-large-int4":
        current_model = Florence2LargeQuantizedImageToText(
            model_id="microsoft/Florence-2-large",
            revision="2024-08-26",  # Same revision as base
        )
        return current_model
```

### Step 2.5: Add Unit Tests

**File**: `meme_search/image_to_text_generator/tests/unit/test_model_init.py`

**Location**: After `TestFlorence2LargeImageToText` class

**Add Two Test Classes** (similar to SmolVLM pattern but for INT4):

```python
class TestFlorence2BaseQuantizedImageToText:
    """Test suite for Florence-2-base INT4 quantized model"""

    def test_init(self):
        """Test Florence-2-base quantized initialization"""
        model = Florence2BaseQuantizedImageToText(
            model_id="microsoft/Florence-2-base", revision="2024-08-26"
        )
        assert model.model_id == "microsoft/Florence-2-base"
        assert model.revision == "2024-08-26"
        assert model.model is None
        assert model.processor is None
        assert model.downloaded is False

    @patch("transformers.BitsAndBytesConfig")
    @patch("model_init.AutoProcessor.from_pretrained")
    @patch("model_init.AutoModelForCausalLM.from_pretrained")
    def test_download_with_int4_quantization_config(self, mock_model, mock_processor, mock_config):
        """Test download with INT4 quantization configuration"""
        # Setup mocks
        mock_model_instance = MagicMock()
        mock_model.return_value = mock_model_instance
        mock_processor_instance = MagicMock()
        mock_processor.return_value = mock_processor_instance

        model = Florence2BaseQuantizedImageToText(
            model_id="microsoft/Florence-2-base", revision="2024-08-26"
        )

        # Execute
        result = model.download()

        # Assert
        assert result is None
        assert model.downloaded is True

        # Verify model loading
        mock_model.assert_called_once()
        call_kwargs = mock_model.call_args[1]
        assert "quantization_config" in call_kwargs
        assert "device_map" in call_kwargs
        assert call_kwargs["device_map"] == "auto"
        assert call_kwargs["trust_remote_code"] is True

        # Verify BitsAndBytesConfig was created with INT4 settings
        import torch
        mock_config.assert_called_once_with(
            load_in_4bit=True,  # ← INT4, not INT8
            bnb_4bit_compute_dtype=torch.bfloat16,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4"
        )

    # Add test_extract_auto_downloads_if_needed
    # Add test_extract_with_already_downloaded_model
    # (Follow SmolVLM pattern but adapt for Florence-2 task_prompt style)
```

**Also update model_selector tests**:
```python
def test_model_selector_florence_2_base_int4(self):
    model = model_selector("Florence-2-base-int4")
    assert isinstance(model, Florence2BaseQuantizedImageToText)
    assert model.model_id == "microsoft/Florence-2-base"

def test_model_selector_florence_2_large_int4(self):
    model = model_selector("Florence-2-large-int4")
    assert isinstance(model, Florence2LargeQuantizedImageToText)
    assert model.model_id == "microsoft/Florence-2-large"
```

### Step 2.6: Update Rails Seeds

**File**: `meme_search/meme_search_app/db/seeds.rb`

**Update arrays**:
```ruby
available_models = [
  "Florence-2-base",
  "Florence-2-base-int4",  # NEW
  "Florence-2-large",
  "Florence-2-large-int4",  # NEW
  "SmolVLM-256M-Instruct",
  "SmolVLM-256M-Instruct-int8",
  "SmolVLM-500M-Instruct",
  "SmolVLM-500M-Instruct-int8",
  "moondream2",
  "moondream2-int8"
]

resources = [
  "https://huggingface.co/microsoft/Florence-2-base",
  "https://huggingface.co/microsoft/Florence-2-base",  # Same as base
  "https://huggingface.co/microsoft/Florence-2-large",
  "https://huggingface.co/microsoft/Florence-2-large",  # Same as base
  # ... rest
]

descriptions = [
  'A popular series of small vision language models built by Microsoft, including a 250 Million (base) and a 700 Million (large) parameter variant.',
  'INT4 quantized version of Florence-2-base (250M params) using NormalFloat4. Reduces memory from ~460MB to ~115MB (75% reduction). Recommended by Microsoft for Florence models. May have 5-10% quality loss - validate for your use case.',
  'The 700 Million parameter vision language model variant of the Florence-2 series.',
  'INT4 quantized version of Florence-2-large (700M params) using NormalFloat4. Reduces memory from ~1.54GB to ~385MB (75% reduction). Recommended by Microsoft for Florence models. Best for quality-constrained environments under 500MB.',
  # ... rest
]
```

## ⚠️ Quality Validation (CRITICAL)

Florence-2 INT4 requires extensive quality testing due to encoder sensitivity.

### Validation Steps

1. **Benchmark Script** (create `test_florence_int4_quality.py`):
```python
from app.model_init import model_selector
import glob

# Load both models
base_model = model_selector("Florence-2-base")
quant_model = model_selector("Florence-2-base-int4")

# Test on all meme images
images = glob.glob("public/memes/test/*.jpg") + glob.glob("public/memes/test/*.gif")

for img in images:
    base_caption = base_model.extract(img)
    quant_caption = quant_model.extract(img)

    print(f"\nImage: {img}")
    print(f"Base:  {base_caption}")
    print(f"INT4:  {quant_caption}")
    print(f"Match: {'✓' if base_caption == quant_caption else '✗'}")
```

2. **Quality Metrics**:
- **Exact match rate**: How many captions are identical?
- **BLEU score**: Semantic similarity (if available)
- **Subjective evaluation**: Do captions make sense?

3. **Acceptance Criteria**:
- ≥70% exact match rate, OR
- ≥95% subjective quality (captions still accurate/useful)
- **No gibberish** (if gibberish appears, INT4 may not work)

4. **Decision Tree**:
- If quality ≥95%: **Ship as stable**
- If quality 85-95%: **Ship as experimental** (document limitations)
- If quality <85%: **Do not ship** (keep as research)

## Testing Checklist

### Unit Tests
- [ ] `pytest tests/unit/test_model_init.py::TestFlorence2BaseQuantizedImageToText -v`
- [ ] `pytest tests/unit/test_model_init.py::TestFlorence2LargeQuantizedImageToText -v`
- [ ] Full suite: `pytest tests/unit/test_model_init.py -v`

### Quality Validation (MOST IMPORTANT)
- [ ] Run `test_florence_int4_quality.py` benchmark
- [ ] Test on 4+ meme images
- [ ] Compare INT4 vs FP16 captions side-by-side
- [ ] Check for gibberish output
- [ ] Measure exact match rate
- [ ] Subjective quality assessment
- [ ] **DECISION**: Ship stable / experimental / do not ship

### Memory Verification
```bash
mise exec -- python -c "
import psutil
from app.model_init import model_selector

baseline = psutil.Process().memory_info().rss / 1024 / 1024
model = model_selector('Florence-2-base-int4')
model.download()
after = psutil.Process().memory_info().rss / 1024 / 1024
print(f'Memory used: {after - baseline:.2f} MB')
print(f'Expected: ~115 MB')
"
```

### Integration Tests
- [ ] `pytest tests/integration/test_app.py -v` (should pass unchanged)

## Expected Outcomes

### Test Results
- **Unit tests**: 8 new tests (4 per model × 2 models)
- **Total tests**: 104 → 112 tests
- **Coverage**: Maintain >80%

### Memory Measurements
- **Florence-2-base-int4**: ~115MB (vs ~460MB base) = 75% reduction
- **Florence-2-large-int4**: ~385MB (vs ~1.54GB base) = 75% reduction

### Quality Expectations
- **Optimistic**: 90-95% quality retention
- **Realistic**: 85-90% quality retention
- **Pessimistic**: 70-85% quality retention (may need experimental flag)
- **Failure case**: <70% or gibberish (do not ship)

## Risk Mitigation

### If Quality is Poor (<85%)

**Option A: Mark as Experimental**
- Add "EXPERIMENTAL" to model name in UI
- Add warning in description: "Quality may vary. Test before production use."
- Keep in codebase for user testing/feedback

**Option B: Do Not Ship**
- Comment out from available_models
- Keep code for future improvements
- Document findings in CLAUDE.md

**Option C: Try Alternative Settings**
- Test different `bnb_4bit_compute_dtype` (float16 instead of bfloat16)
- Test without `bnb_4bit_use_double_quant`
- Test different `bnb_4bit_quant_type` (standard INT4 instead of NF4)

### If Multi-GPU Gibberish Occurs
- Document as single-GPU only
- Add device check in code
- Warn users in description

## Completion Criteria

- [ ] Both INT4 quantized classes implemented
- [ ] Constants and model_selector updated
- [ ] Unit tests added and passing
- [ ] **Quality validation complete** (≥85% quality)
- [ ] Memory measurements confirm 75% reduction
- [ ] Rails seeds updated
- [ ] Decision made: stable / experimental / do-not-ship

## Next Phase

After Phase 2 completion (if quality acceptable), proceed to **Phase 3: Rails UI Enhancement & Documentation**.
