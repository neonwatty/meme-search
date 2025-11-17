# Phase 4: Final Validation & Deployment

**Duration**: 1 day
**Risk Level**: Low (validation and polish only)
**Dependencies**: Phases 1, 2, 3 complete

## Objectives

1. Run comprehensive test suite (unit + integration + E2E)
2. Perform memory benchmarking on all quantized models
3. Quality validation on representative memes
4. Docker build verification (AMD64 + ARM64)
5. Create release checklist
6. Final documentation review

## Comprehensive Testing

### Step 4.1: Python Unit Tests

```bash
cd meme_search/image_to_text_generator

# Run full unit test suite
mise exec -- pytest tests/unit/test_model_init.py -v

# Expected: 112 tests (88 original + 24 new)
# - 8 for SmolVLM-256M-int8
# - 8 for SmolVLM-500M-int8
# - 8 for Florence-2-base-int4
# - 8 for Florence-2-large-int4

# Run with coverage
mise exec -- pytest tests/unit/ --cov=app --cov-report=html --cov-report=term

# Verify coverage ≥80%
open htmlcov/index.html
```

**Expected Results:**
- ✅ 112/112 tests passing
- ✅ Coverage ≥80% maintained
- ✅ No warnings or deprecations

### Step 4.2: Python Integration Tests

```bash
# Run integration tests (uses "test" model, fast)
mise exec -- pytest tests/integration/test_app.py -v

# Expected: All tests pass unchanged (no modifications needed)
```

**Expected Results:**
- ✅ All integration tests passing
- ✅ FastAPI endpoints working
- ✅ Rails callback mocking functional

### Step 4.3: Rails Tests

```bash
cd meme_search/meme_search_app

# Reset database with new seeds
mise exec -- bin/rails db:reset RAILS_ENV=test

# Verify 10 models seeded
mise exec -- bin/rails runner "puts ImageToText.count" RAILS_ENV=test
# Expected output: 10

# Run controller tests
mise exec -- bin/rails test test/controllers/settings/image_to_texts_controller_test.rb

# Run all Rails tests
mise exec -- bash run_tests.sh
```

**Expected Results:**
- ✅ 10 ImageToText records in test DB
- ✅ All controller tests passing
- ✅ No regressions in model tests

### Step 4.4: E2E Tests (Playwright)

```bash
# From project root
npm run test:e2e -- image-to-texts.spec.ts

# Or run in UI mode for debugging
npm run test:e2e:ui -- image-to-texts.spec.ts
```

**Expected Results:**
- ✅ Model selection tests pass with 10 models
- ✅ Exclusive selection behavior works
- ✅ UI renders all badges correctly

### Step 4.5: Full E2E Suite (Optional but Recommended)

```bash
# Run all E2E tests (16 tests, ~5-10 min)
npm run test:e2e

# Expected: 16/16 passing (same as before, no regressions)
```

## Memory Benchmarking

### Step 4.6: Create Benchmarking Script

**File**: `meme_search/image_to_text_generator/benchmark_quantized_models.py`

```python
"""
Benchmark memory usage for all quantized models.
Compares base vs quantized memory footprint.
"""
import psutil
import time
from app.model_init import model_selector

def measure_memory(model_name):
    """Measure memory usage for a model"""
    process = psutil.Process()

    # Baseline
    baseline = process.memory_info().rss / 1024 / 1024

    # Load model
    print(f"\nLoading {model_name}...")
    start_time = time.time()
    model = model_selector(model_name)
    model.download()
    load_time = time.time() - start_time

    # After load
    after_load = process.memory_info().rss / 1024 / 1024
    model_memory = after_load - baseline

    return {
        "model": model_name,
        "memory_mb": round(model_memory, 2),
        "load_time_sec": round(load_time, 2)
    }

if __name__ == "__main__":
    models = [
        # SmolVLM family
        ("SmolVLM-256M-Instruct", "SmolVLM-256M-Instruct-int8"),
        ("SmolVLM-500M-Instruct", "SmolVLM-500M-Instruct-int8"),

        # Florence family (skip for now - too slow to download both)
        # ("Florence-2-base", "Florence-2-base-int4"),
        # ("Florence-2-large", "Florence-2-large-int4"),

        # Moondream family
        ("moondream2", "moondream2-int8"),
    ]

    results = []

    for base_model, quant_model in models:
        print(f"\n{'='*60}")
        print(f"Benchmarking {base_model} vs {quant_model}")
        print('='*60)

        base_result = measure_memory(base_model)
        quant_result = measure_memory(quant_model)

        reduction = ((base_result["memory_mb"] - quant_result["memory_mb"]) /
                     base_result["memory_mb"] * 100)

        results.append({
            "family": base_model.split("-")[0],
            "base_model": base_model,
            "base_memory_mb": base_result["memory_mb"],
            "quant_model": quant_model,
            "quant_memory_mb": quant_result["memory_mb"],
            "reduction_percent": round(reduction, 1),
            "base_load_time": base_result["load_time_sec"],
            "quant_load_time": quant_result["load_time_sec"]
        })

    # Print summary table
    print("\n" + "="*80)
    print("MEMORY BENCHMARK SUMMARY")
    print("="*80)
    print(f"{'Model':<30} {'Base Memory':<15} {'Quant Memory':<15} {'Reduction':<12}")
    print("-"*80)

    for r in results:
        print(f"{r['base_model']:<30} {r['base_memory_mb']:>10.2f} MB  "
              f"{r['quant_memory_mb']:>10.2f} MB  {r['reduction_percent']:>8.1f}%")

    print("="*80)

    # Verify expectations
    print("\nVERIFICATION:")
    for r in results:
        expected = {
            "SmolVLM-256M": (256, 500, 40, 60),  # Expect ~256MB, target 49%
            "SmolVLM-500M": (400, 600, 65, 80),  # Expect ~500MB, target 72%
            "moondream2": (1400, 2200, 50, 70),  # Expect ~1.5-2GB, target 60%
        }

        family = r["family"]
        if family in expected:
            min_mem, max_mem, min_reduction, max_reduction = expected[family]
            quant_mem = r["quant_memory_mb"]
            reduction = r["reduction_percent"]

            mem_ok = min_mem <= quant_mem <= max_mem
            reduction_ok = min_reduction <= reduction <= max_reduction

            status = "✅ PASS" if (mem_ok and reduction_ok) else "❌ FAIL"
            print(f"{r['quant_model']:<30} {status}")
            if not mem_ok:
                print(f"  ⚠️ Memory {quant_mem:.2f}MB not in expected range {min_mem}-{max_mem}MB")
            if not reduction_ok:
                print(f"  ⚠️ Reduction {reduction:.1f}% not in expected range {min_reduction}-{max_reduction}%")
```

**Run benchmark**:
```bash
cd meme_search/image_to_text_generator
mise exec -- python benchmark_quantized_models.py
```

**Expected Output**:
```
MEMORY BENCHMARK SUMMARY
================================================================================
Model                          Base Memory     Quant Memory    Reduction
--------------------------------------------------------------------------------
SmolVLM-256M-Instruct               500.00 MB      256.00 MB      48.0%
SmolVLM-500M-Instruct              1800.00 MB      500.00 MB      72.2%
moondream2                         5000.00 MB     1600.00 MB      68.0%
================================================================================

VERIFICATION:
SmolVLM-256M-Instruct-int8     ✅ PASS
SmolVLM-500M-Instruct-int8     ✅ PASS
moondream2-int8                ✅ PASS
```

## Quality Validation

### Step 4.7: Caption Comparison Script

**File**: `meme_search/image_to_text_generator/compare_model_quality.py`

```python
"""
Compare captions between base and quantized models.
Validates quality retention.
"""
from app.model_init import model_selector
import glob

def compare_models(base_model, quant_model, test_images):
    """Compare captions from two models"""
    print(f"\n{'='*80}")
    print(f"Comparing {base_model} vs {quant_model}")
    print('='*80)

    base = model_selector(base_model)
    quant = model_selector(quant_model)

    exact_matches = 0
    total = len(test_images)

    for img_path in test_images:
        base_caption = base.extract(img_path)
        quant_caption = quant.extract(img_path)

        match = base_caption.strip() == quant_caption.strip()
        if match:
            exact_matches += 1

        print(f"\nImage: {img_path.split('/')[-1]}")
        print(f"Base:  {base_caption}")
        print(f"Quant: {quant_caption}")
        print(f"Match: {'✅' if match else '❌'}")

    match_rate = (exact_matches / total) * 100
    print(f"\n{'='*80}")
    print(f"Exact match rate: {exact_matches}/{total} ({match_rate:.1f}%)")
    print('='*80)

    return match_rate

if __name__ == "__main__":
    # Test images
    test_images = glob.glob("public/memes/test/*.jpg") + glob.glob("public/memes/test/*.gif")
    test_images = test_images[:4]  # Limit to 4 for speed

    print(f"Testing on {len(test_images)} images: {[p.split('/')[-1] for p in test_images]}")

    # Compare each family
    comparisons = [
        ("SmolVLM-256M-Instruct", "SmolVLM-256M-Instruct-int8", 90),  # Expect ≥90%
        ("SmolVLM-500M-Instruct", "SmolVLM-500M-Instruct-int8", 90),  # Expect ≥90%
        ("moondream2", "moondream2-int8", 85),  # Expect ≥85%
        # Florence: Skip for now (INT4 is experimental)
    ]

    results = []
    for base, quant, threshold in comparisons:
        match_rate = compare_models(base, quant, test_images)
        passed = match_rate >= threshold
        results.append((quant, match_rate, threshold, passed))

    # Summary
    print("\n" + "="*80)
    print("QUALITY VALIDATION SUMMARY")
    print("="*80)
    for model, rate, threshold, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{model:<35} {rate:>5.1f}% (threshold: ≥{threshold}%) {status}")
```

**Run quality check**:
```bash
mise exec -- python compare_model_quality.py
```

**Expected Results:**
- ✅ SmolVLM-256M-int8: ≥90% match rate (proven in docs)
- ✅ SmolVLM-500M-int8: ≥90% match rate (proven in docs)
- ✅ Moondream2-int8: ≥85% match rate (known from existing tests)
- ⚠️ Florence-2-int4: Manual testing only (experimental)

## Docker Build Verification

### Step 4.8: Docker Build Test

```bash
# From project root
cd /Users/neonwatty/Desktop/meme-search

# Build image_to_text_generator service
docker compose -f docker-compose-local-build.yml build image_to_text_generator

# Verify no errors
docker images | grep image_to_text_generator

# Test container starts
docker compose -f docker-compose-local-build.yml up -d image_to_text_generator

# Check logs
docker compose -f docker-compose-local-build.yml logs image_to_text_generator

# Verify service is healthy
curl http://localhost:8000/check_queue

# Clean up
docker compose -f docker-compose-local-build.yml down
```

**Expected Results:**
- ✅ Docker build succeeds with no errors
- ✅ Container starts without import errors for bitsandbytes
- ✅ `/check_queue` endpoint returns 200 OK
- ✅ Image size reasonable (<5GB)

### Step 4.9: ARM64 Compatibility Check (Optional)

If running on Apple Silicon:
```bash
# Build for ARM64
docker compose -f docker-compose-local-build.yml build --platform linux/arm64 image_to_text_generator

# Verify bitsandbytes works on ARM64
docker run --rm --platform linux/arm64 \
  image_to_text_generator \
  python -c "import bitsandbytes; print('BitsAndBytes OK')"
```

**Expected**: "BitsAndBytes OK" (or document as x86-only)

## Release Checklist

### Step 4.10: Pre-Release Checklist

**Code Quality:**
- [ ] All 112 unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing (16/16)
- [ ] No linting errors (`mise exec -- ruff check app/`)
- [ ] Coverage ≥80%

**Functionality:**
- [ ] All 10 models selectable in UI
- [ ] Memory savings verified (≥45% for all quantized)
- [ ] Quality validation passed (≥85% for all)
- [ ] Docker build succeeds
- [ ] FastAPI endpoints working

**Documentation:**
- [ ] README.md updated with memory table
- [ ] CLAUDE.md updated with quantization patterns
- [ ] All model descriptions in seeds.rb accurate
- [ ] Hardware recommendations clear
- [ ] Experimental flags on INT4 models

**User Experience:**
- [ ] UI badges displaying correctly
- [ ] Help section explains quantization
- [ ] Model selection works smoothly
- [ ] No JavaScript errors in console
- [ ] Mobile responsive (test on small screen)

### Step 4.11: Known Issues Documentation

**File**: `plans/lite-model-plans/KNOWN_ISSUES.md`

```markdown
# Known Issues - Quantized Models

## Florence-2 INT4 (Experimental)

**Status**: Experimental - validate quality before production use

**Known Limitations:**
- Encoder sensitivity may cause 5-10% quality degradation
- Recommended by Microsoft but requires testing per use case
- Multi-GPU may produce gibberish (single-GPU only)
- No CPU offloading support

**Recommendation**: Test thoroughly on your meme dataset before deploying

## BitsAndBytes Hardware Support

**Supported:**
- NVIDIA GPUs (CUDA)
- AMD GPUs (ROCm)
- CPU (INT4 only, INT8 requires GPU)

**Not Supported:**
- Apple Metal (MPS) - BitsAndBytes doesn't support MPS yet
- Integrated GPUs (may work but slow)

**Workaround**: Use FP16/BF16 models on unsupported hardware

## ARM64 Compatibility

**Status**: Tested on x86-64 primarily

**Notes:**
- Docker builds for ARM64 may work but untested in CI
- BitsAndBytes support for ARM64 varies by version
- M1/M2 Macs: Use MPS-compatible FP16 models for now

## Memory Estimates

Actual memory usage may vary by:
- Hardware (GPU VRAM vs system RAM)
- Batch size
- Concurrent requests
- Other running services

Estimates are for single-image inference.
```

## Final Validation

### Step 4.12: Smoke Test

```bash
# Start full stack locally
./scripts/reset-and-rebuild.sh --keep-models

# Navigate to http://localhost:3000
# 1. Go to Settings > AI Models
# 2. Select SmolVLM-256M-Instruct-int8
# 3. Click "Save Selection"
# 4. Go to Meme Gallery
# 5. Upload a test image
# 6. Click "Generate Descriptions"
# 7. Verify description appears within 10-30s
# 8. Check quality is reasonable

# Repeat for other quantized models
```

**Expected Results:**
- ✅ All quantized models generate descriptions
- ✅ Quality is acceptable (not gibberish)
- ✅ Performance is reasonable (<60s per image)
- ✅ No errors in Rails logs
- ✅ No errors in Python logs

## Completion Criteria

### All Tests Passing
- [ ] 112/112 Python unit tests ✅
- [ ] Integration tests ✅
- [ ] 16/16 E2E tests ✅
- [ ] Rails tests ✅

### Benchmarks Met
- [ ] Memory reduction ≥45% all quantized models ✅
- [ ] Quality retention ≥85% all models ✅
- [ ] Docker build succeeds ✅

### Documentation Complete
- [ ] README.md memory table ✅
- [ ] CLAUDE.md quantization patterns ✅
- [ ] Known issues documented ✅
- [ ] Hardware recommendations clear ✅

### Release Ready
- [ ] Feature branch created ✅
- [ ] All code committed ✅
- [ ] Tests passing in CI (if applicable) ✅
- [ ] Ready for PR review ✅

## Post-Completion

After Phase 4 validation:

1. **Create Pull Request**:
   - Branch: `feature/add-quantized-models` → `main`
   - Title: "Add INT8/INT4 quantized model variants for memory efficiency"
   - Description: Link to plans, include memory benchmarks

2. **Merge to Main** (after review)

3. **Monitor Production**:
   - Watch for user reports on quality
   - Monitor memory usage
   - Collect feedback on model selection

4. **Future Enhancements**:
   - Grouped accordion UI (from Phase 3 Option B)
   - More model variants (BLIP, GIT, Qwen2-VL)
   - ONNX export for CPU optimization
   - Auto-recommendation based on system memory

## Success Metrics

**Quantitative:**
- 10 models available (up from 6) ✅
- ≥45% memory reduction for all quantized ✅
- ≥85% quality retention ✅
- 112 tests (up from 88) ✅

**Qualitative:**
- Users can choose models based on hardware ✅
- Clear documentation and recommendations ✅
- No breaking changes for existing users ✅
- Experimental flags prevent confusion ✅

**This completes the quantized models implementation!** 🎉
