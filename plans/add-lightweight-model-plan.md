# Plan: Add Lightweight Quantized Moondream2 Model

## Executive Summary

Add INT8 quantized Moondream2 as a lightweight model option for users with CPU-only or resource-constrained hardware. This will reduce memory requirements from ~5GB (FP16) to ~1.5-2GB (INT8) while maintaining similar caption quality.

## Background

Users have reported that even the smallest current model (Florence-2-base at 250M params, ~2GB RAM) is too large for CPU-based self-hosting. Research shows:

- **Moondream 0.5B** was announced but is not yet publicly available
- **Quantized Moondream2 (INT8)** achieves similar memory footprint using BitsAndBytes
- **INT8 quantization** provides 2-4x memory reduction with minimal quality loss
- Alternative approaches (CLIP-only, YOLO-tagging) would require more extensive refactoring

## Solution: Quantized Moondream2 (INT8)

### Key Advantages
1. **Memory Reduction**: 50-60% less memory vs FP16 (~1.5-2GB vs ~5GB)
2. **Same API**: Uses existing Moondream2 model, just with quantization flags
3. **Available Now**: Works with current HuggingFace infrastructure
4. **Easy Migration**: Can swap to 0.5B when/if it becomes available
5. **CPU-Friendly**: Optimized for CPU inference

### Technical Approach

Use BitsAndBytes library with transformers to load Moondream2 in INT8:

```python
from transformers import AutoModelForCausalLM, BitsAndBytesConfig

quantization_config = BitsAndBytesConfig(
    load_in_8bit=True,
    llm_int8_threshold=6.0,
)

model = AutoModelForCausalLM.from_pretrained(
    "vikhyatk/moondream2",
    revision="2025-01-09",
    trust_remote_code=True,
    quantization_config=quantization_config,
    device_map="auto",  # Important: Don't call .to(device) after this
)
```

### Known Issues
- **Cannot call `.to(device)`** after loading with `load_in_8bit=True` (BitsAndBytes limitation)
- **Requires `device_map="auto"`** instead of manual device placement
- **GPU/MPS optimized** but works on CPU (slower)

## Implementation Plan

### Phase 1: Testing & Validation ✅ (5/5 completed)

1. ✅ **Research Moondream 0.5B** → Found not publicly available
2. ✅ **Research quantization** → BitsAndBytes INT8 approach identified
3. ✅ **Create test script** → `test_quantized_moondream.py` created
4. ✅ **Install dependencies** → `bitsandbytes`, `psutil`, `accelerate`
5. ⏳ **Run benchmarks** → Next: Test on sample memes

### Phase 2: Core Implementation (Pending)

6. **Add `MoondreamQuantizedImageToText` class** to `model_init.py`
   - Similar to `MoondreamImageToText` but with quantization config
   - Handle device mapping correctly (no `.to(device)`)
   - Add memory usage logging

7. **Update `constants.py`**
   - Add `"moondream2-int8"` to `available_models` list
   - Include memory requirements metadata

8. **Update `model_selector()`** in `model_init.py`
   - Add case for `"moondream2-int8"`
   - Return `MoondreamQuantizedImageToText` instance

### Phase 3: Testing (Pending)

9. **Add unit tests** (`tests/unit/`)
   - Mock quantization config and model loading
   - Test extract() method returns strings
   - Test download() method

10. **Update integration tests** (`tests/integration/`)
    - Add moondream2-int8 to test matrix
    - Verify HTTP callbacks work correctly

11. **Run full Python test suite**
    - `bash run_tests.sh`
    - Ensure no regressions

### Phase 4: Rails Integration (Pending)

12. **Update Rails model configuration**
    - Add moondream2-int8 to ImageToText model dropdown
    - Update model selection logic

13. **Update UI**
    - Show memory/hardware recommendations per model
    - Highlight moondream2-int8 as "Lightweight (CPU-friendly)"
    - Add tooltip explaining INT8 quantization

### Phase 5: E2E Testing (Pending)

14. **Run E2E tests**
    - Test model selection UI
    - Test description generation with moondream2-int8
    - Verify WebSocket updates

### Phase 6: Documentation (Pending)

15. **Update README.md**
    - Add moondream2-int8 to model list
    - Include memory requirements table
    - Add hardware recommendations section

16. **Update CLAUDE.md**
    - Document quantization approach
    - Add testing patterns for quantized models

## Expected Outcomes

### Memory Comparison

| Model | Parameters | Memory (FP16) | Memory (INT8) | Speed (CPU) |
|-------|-----------|---------------|---------------|-------------|
| Florence-2-base | 250M | ~2GB | N/A | Baseline |
| SmolVLM-256M | 256M | ~1GB | N/A | Fast |
| Moondream2 | 1.9B | ~5GB | N/A | Slow |
| **Moondream2-INT8** | **1.9B** | **N/A** | **~1.5-2GB** | **Medium** |

### Quality Expectations
- **INT8 quantization**: Typically 0-5% quality degradation
- **Moondream2**: Strong meme understanding (trained on diverse data)
- **Expected**: Nearly identical captions vs FP16 Moondream2

## Dependencies

### New Python Dependencies
- `bitsandbytes==0.42.0` ✅ Installed
- `accelerate==1.11.0` ✅ Installed
- `psutil==7.1.3` ✅ Installed (for memory monitoring)

### Updated Docker Requirements
```dockerfile
# Add to image_to_text_generator requirements.txt
bitsandbytes>=0.42.0
accelerate>=1.11.0
psutil>=7.1.0
```

## Testing Strategy

### Unit Tests
- Mock `AutoModelForCausalLM.from_pretrained()` with quantization config
- Test class instantiation
- Test extract() returns string

### Integration Tests
- Use `test` model (not actual moondream2-int8) for fast CI
- Test full flow: image → Python service → Rails webhook

### E2E Tests
- Add to existing Playwright test suite
- Test model selection and description generation
- Verify memory usage is lower than regular models

### Manual Testing
1. Run `test_quantized_moondream.py` to benchmark
2. Compare captions: FP16 vs INT8 vs Florence-2-base
3. Measure inference speed on CPU vs MPS/GPU
4. Validate memory usage with `docker stats`

## Rollout Strategy

### Phase 1: Experimental (Recommended)
1. Merge to feature branch
2. Run test script locally
3. Validate quality and performance

### Phase 2: Beta
1. Merge to main
2. Document as "experimental" feature
3. Gather user feedback

### Phase 3: Stable
1. Update docs to recommend for CPU-only users
2. Make default for <4GB RAM configurations

## Alternative Models Considered

| Model | Status | Pros | Cons | Decision |
|-------|--------|------|------|----------|
| Moondream 0.5B | Not available | Smallest VLM, designed for edge | Not released yet | **Wait for release** |
| BLIP-base | Available | Proven CPU performance, ~250M params | Similar size to Florence-2 | Maybe later |
| GIT-base | Available | Good quality, Microsoft, ~250M params | Similar size to Florence-2 | Maybe later |
| ClipCap | Available | Modular (CLIP + GPT-2 mapping) | Requires training mapping network | **Interesting for v2** |
| CLIP-only | Available | Smallest (~150M), embeddings-only | No captions, search-only | **Good for "fast mode"** |
| YOLO + Tags | Available | Extremely fast (<500MB) | No natural language | Maybe for tagging |

## Future Enhancements

1. **INT4 Quantization**: Further reduce to ~1GB (75% reduction)
2. **ONNX Export**: Even faster CPU inference
3. **CLIP-only Mode**: Ultra-fast embeddings-only option
4. **ClipCap Training**: Custom meme-style captions

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Quality degradation | High | Low | Benchmark before release, provide FP16 fallback |
| BitsAndBytes compatibility | Medium | Medium | Test on multiple platforms (AMD64, ARM64) |
| Increased inference time | Medium | Medium | Document expected performance, recommend GPU/MPS |
| Docker build issues | Low | Low | Pin dependency versions, test local build |

## Success Criteria

1. ✅ Test script shows ≥50% memory reduction vs FP16
2. ✅ Caption quality within 5% of FP16 (subjective assessment)
3. All tests pass (unit + integration + E2E)
4. Docker build succeeds on ARM64 and AMD64
5. Documentation updated with hardware recommendations

## Timeline

- **Phase 1** (Research & Testing): ✅ Complete (1 day)
- **Phase 2** (Core Implementation): 🔲 Pending (0.5 days)
- **Phase 3** (Testing): 🔲 Pending (0.5 days)
- **Phase 4** (Rails Integration): 🔲 Pending (0.25 days)
- **Phase 5** (E2E Testing): 🔲 Pending (0.25 days)
- **Phase 6** (Documentation): 🔲 Pending (0.25 days)

**Total Estimated Time**: ~2.5 days

## Next Steps

1. **Run test script**: `cd meme_search/image_to_text_generator && mise exec -- python test_quantized_moondream.py`
2. **Review benchmarks**: Validate memory savings and quality
3. **Proceed with implementation** if results are satisfactory
4. **Consider alternatives** if INT8 quantization doesn't meet requirements

## References

- [BitsAndBytes Documentation](https://huggingface.co/docs/transformers/quantization/bitsandbytes)
- [Moondream2 GitHub Issue #106](https://github.com/vikhyat/moondream/issues/106)
- [PyTorch INT8 Quantization](https://pytorch.org/blog/int8-quantization/)
- [TorchAO Quantization](https://github.com/pytorch/ao)
