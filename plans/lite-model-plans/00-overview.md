# INT8 Quantization Implementation Plan - Overview

## Status: REVISED AFTER VERIFICATION

**Date**: 2025-01-17
**Branch**: `feature/add-quantized-models` (to be created)
**Estimated Duration**: 5-7 days

## Executive Summary

Add INT8 quantized variants for Florence-2 and SmolVLM models to provide memory-efficient options for users with limited hardware resources. This builds on the existing `moondream2-int8` implementation.

## Critical Findings from Research

### 1. Moondream2-INT8 Already Exists ✅
The quantized Moondream2 model is **fully implemented** in the codebase:
- Python class: `MoondreamQuantizedImageToText` (model_init.py:102-175)
- Tests: Complete unit test suite (test_model_init.py:127-212)
- Rails integration: Seeds.rb entry exists
- **This serves as our reference implementation**

### 2. HuggingFace Model Availability
**No pre-quantized INT8 PyTorch models exist** for any of our models. Instead:
- We use **BitsAndBytes on-the-fly quantization**
- Load the same base model ID (e.g., `microsoft/Florence-2-base`)
- Apply `BitsAndBytesConfig(load_in_8bit=True)` during loading
- GGUF versions exist but require llama.cpp (different framework)

### 3. Florence-2 Quantization Concerns ⚠️
Florence-2 models are **"extremely sensitive to quantization settings, especially of the encoder"**:
- Official docs recommend **4-bit quantization**, not 8-bit
- Multi-GPU INT8 may produce gibberish
- No CPU offloading support with INT8
- **Recommendation**: Use 4-bit (INT4) instead, or test INT8 carefully

### 4. SmolVLM Strong Support ✅
SmolVLM models have **excellent INT8 documentation**:
- Official HuggingFace docs show BitsAndBytes INT8 examples
- Proven 1.7x TTFT improvement and 1.4x throughput increase
- No known quality issues
- **Recommendation**: Proceed with INT8 for SmolVLM

## Revised Model Selection

Based on research findings:

### Priority 1: SmolVLM Models (HIGH CONFIDENCE)
- ✅ **SmolVLM-256M-Instruct-int8** - Well-supported, proven benefits
- ✅ **SmolVLM-500M-Instruct-int8** - Well-supported, proven benefits

### Priority 2: Florence-2 Models (PROCEED WITH CAUTION)
- ⚠️ **Florence-2-base-int4** - Use 4-bit instead of 8-bit (per official docs)
- ⚠️ **Florence-2-large-int4** - Use 4-bit instead of 8-bit (per official docs)

### Already Complete
- ✅ **moondream2-int8** - Fully implemented, use as template

## Technical Approach

### BitsAndBytes Pattern (from existing moondream2-int8)

```python
from transformers import AutoModelForCausalLM, BitsAndBytesConfig

# INT8 Configuration
quantization_config = BitsAndBytesConfig(
    load_in_8bit=True,
    llm_int8_threshold=6.0,  # Standard threshold
)

# Load with quantization
model = AutoModelForCausalLM.from_pretrained(
    "model/name",  # Same model ID, not a separate quantized version
    quantization_config=quantization_config,
    device_map="auto",  # Required - don't use .to(device)
    trust_remote_code=True
)
```

### INT4 Configuration (for Florence-2)

```python
quantization_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,  # Further compression
    bnb_4bit_quant_type="nf4"  # NormalFloat4
)
```

### Critical Constraints

1. **Cannot use `.to(device)`** after loading with quantization
2. **Must use `device_map="auto"`** - BitsAndBytes handles device placement
3. **No CPU offloading** with INT8 (INT4 supports it)
4. **GPU-only** for quantization (NVIDIA/AMD, no MPS support)
5. **Same model ID** - we quantize the base model on-the-fly

## Implementation Phases

### Phase 1: SmolVLM INT8 Quantization (Days 1-2)
- Add `SmolVLM256QuantizedImageToText` class
- Add `SmolVLM500QuantizedImageToText` class
- Unit tests following moondream2-int8 pattern
- **Risk: Low** - Well-documented, proven approach

### Phase 2: Florence-2 INT4 Quantization (Days 3-4)
- Add `Florence2BaseQuantizedImageToText` class (INT4, not INT8)
- Add `Florence2LargeQuantizedImageToText` class (INT4, not INT8)
- Extensive testing for quality validation
- **Risk: Medium** - Encoder sensitivity, recommended by docs but needs validation

### Phase 3: Rails Integration (Day 5)
- Update seeds.rb with 4 new models
- Update UI with quantization badges and descriptions
- User education: What is INT4 vs INT8?

### Phase 4: Testing & Documentation (Days 6-7)
- E2E Playwright tests
- Memory benchmarks (docker stats)
- Quality comparison (captions)
- Update README.md and CLAUDE.md

## Expected Memory Savings

| Model | Base Precision | Base Memory | Quantized | Quant Memory | Reduction |
|-------|---------------|-------------|-----------|--------------|-----------|
| SmolVLM-256M | BF16 | ~500MB | INT8 | **~256MB** | 49% |
| SmolVLM-500M | BF16 | ~1.8GB | INT8 | **~500MB** | 72% |
| Florence-2-base | FP16 | ~460MB | INT4 | **~115MB** | 75% |
| Florence-2-large | FP16 | ~1.54GB | INT4 | **~385MB** | 75% |

## Quality Expectations

- **SmolVLM INT8**: 99-100% quality retention (proven)
- **Florence-2 INT4**: 95-99% quality retention (needs validation)
- **Threshold for acceptance**: ≥95% quality vs base model

## Success Criteria

1. ✅ All unit tests pass (target: 120+ tests, maintain >80% coverage)
2. ✅ Memory reduction matches estimates (±10%)
3. ✅ Quality retention ≥95% on test memes
4. ✅ E2E tests pass with new models
5. ✅ Docker builds successfully on AMD64 and ARM64
6. ✅ Documentation updated with hardware recommendations

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Florence-2 INT8 quality poor | High | High | Use INT4 instead (per docs) |
| Florence-2 INT4 quality poor | Medium | Medium | Make optional, document as experimental |
| BitsAndBytes ARM64 issues | Medium | Low | Test early, document x86-only if needed |
| SmolVLM INT8 quality poor | Low | Very Low | Well-documented, proven approach |

## Dependencies

**Already in requirements.txt ✅:**
- `bitsandbytes>=0.42.0`
- `accelerate>=1.11.0`
- `psutil>=7.1.0`

**No additional dependencies needed**

## Files to Modify

**Python Service:**
- `app/model_init.py` - Add 4 new quantized classes
- `app/constants.py` - Add 4 model names
- `tests/unit/test_model_init.py` - Add test classes

**Rails App:**
- `db/seeds.rb` - Add 4 ImageToText records
- `db/seeds/test_seed.rb` - Add 4 test records
- `app/views/settings/image_to_texts/index.html.erb` - Update UI (optional)

**Documentation:**
- `README.md` - Add memory comparison table
- `CLAUDE.md` - Document quantization patterns

## Next Steps

1. Read existing `moondream2-int8` implementation thoroughly
2. Create feature branch `feature/add-quantized-models`
3. Start with Phase 1 (SmolVLM) - lowest risk
4. Validate quality before proceeding to Phase 2 (Florence-2)
5. Consider making Florence-2 INT4 optional/experimental

## References

- Existing implementation: `model_init.py:102-175` (MoondreamQuantizedImageToText)
- BitsAndBytes docs: https://huggingface.co/docs/transformers/quantization/bitsandbytes
- Florence-2 quantization: Official docs recommend 4-bit over 8-bit
- SmolVLM quantization: Official docs show INT8 examples
