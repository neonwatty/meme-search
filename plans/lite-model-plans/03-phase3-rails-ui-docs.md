# Phase 3: Rails UI Enhancement & Documentation

**Duration**: 2 days
**Risk Level**: Low (UI/documentation only, no model changes)
**Dependencies**: Phase 1 & 2 complete (4 new quantized models added)

## Objectives

1. Enhance Settings UI to clearly explain quantization options
2. Add user education about INT4 vs INT8 trade-offs
3. Update documentation (README, CLAUDE.md)
4. Create E2E tests for new models
5. Verify full integration

## Current State

After Phase 1 & 2, we have:
- **10 total models** (up from 6):
  - Florence-2-base (FP16)
  - Florence-2-base-int4 (NEW)
  - Florence-2-large (FP16)
  - Florence-2-large-int4 (NEW)
  - SmolVLM-256M-Instruct (BF16)
  - SmolVLM-256M-Instruct-int8 (NEW)
  - SmolVLM-500M-Instruct (BF16)
  - SmolVLM-500M-Instruct-int8 (NEW)
  - Moondream2 (FP16)
  - Moondream2-int8 (EXISTING)

Current UI: Flat list of 10 cards (cluttered)

## UI Enhancement Options

### Option A: Add Badges & Memory Info (Minimal Change)

Keep current card layout but enhance each card with:
- **Memory badge**: `💾 ~256MB` or `💾 ~1.5GB`
- **Quantization badge**: `[INT4 Quantized]` or `[INT8 Optimized]`
- **Recommendation badge**: `[💚 CPU-Friendly]` or `[⚡ GPU Recommended]`

**Pros**: Simple, low risk, quick to implement
**Cons**: Still 10 separate cards, not grouped

### Option B: Grouped Accordion UI (Optimal, More Work)

Group models by family with expandable quantization options:
- Florence-2-base ▼
  - Full Precision (FP16) - ~460MB
  - INT4 Optimized - ~115MB [💚 Recommended for <512MB]
- SmolVLM-256M ▼
  - Full Precision (BF16) - ~500MB
  - INT8 Optimized - ~256MB [💚 Recommended for CPU]

**Pros**: Clean, scalable, educational
**Cons**: More complex, requires Stimulus controller changes

### Recommendation: **Option A for Phase 3**

Implement Option A (badges) now for quick wins. Option B (accordion) can be a future enhancement when we have more model variants.

## Implementation Steps

### Step 3.1: Update Seeds with Enhanced Descriptions

**File**: `meme_search/meme_search_app/db/seeds.rb`

**Enhance descriptions** to include hardware recommendations:

```ruby
descriptions = [
  # Florence-2-base
  'Microsoft Florence-2-base (250M params, ~460MB). Balanced performance for general meme captioning. Best for: GPU with 1GB+ VRAM or modern CPU.',

  # Florence-2-base-int4
  'INT4 quantized Florence-2-base (~115MB, 75% reduction). Ultra-compact using NormalFloat4 quantization. Slight quality trade-off (5-10%). Best for: CPU-only or <512MB memory. [Experimental - validate quality]',

  # Florence-2-large
  'Microsoft Florence-2-large (700M params, ~1.54GB). Best quality in Florence series. Best for: GPU with 2GB+ VRAM.',

  # Florence-2-large-int4
  'INT4 quantized Florence-2-large (~385MB, 75% reduction). Best quality under 500MB. Slight quality trade-off (5-10%). Best for: Limited GPU memory or CPU with 1GB+ RAM. [Experimental - validate quality]',

  # SmolVLM-256M
  'Hugging Face SmolVLM-256M (256M params, ~500MB). Compact modern VLM. Best for: Balanced CPU/GPU deployment.',

  # SmolVLM-256M-int8
  'INT8 quantized SmolVLM-256M (~256MB, 49% reduction). Proven 1.7x faster TTFT, minimal quality loss. Best for: CPU-only machines, laptops, edge devices.',

  # SmolVLM-500M
  'Hugging Face SmolVLM-500M (500M params, ~1.8GB). Enhanced quality over 256M. Best for: GPU or high-memory CPU.',

  # SmolVLM-500M-int8
  'INT8 quantized SmolVLM-500M (~500MB, 72% reduction). Best CPU option for quality. Proven 1.4x throughput boost, minimal quality loss. Best for: CPU deployment with quality requirements.',

  # Moondream2
  'Moondream2 (1.9B params, ~5GB). High-quality meme understanding, excellent OCR. Best for: GPU with 6GB+ VRAM.',

  # Moondream2-int8
  'INT8 quantized Moondream2 (~1.5-2GB, 60% reduction). Best quality for memory-constrained setups. Minimal quality loss (0-5%). Best for: CPU-only or GPU with 2-4GB VRAM.'
]
```

### Step 3.2: Add UI Helper for Memory Badges

**File**: `meme_search/meme_search_app/app/helpers/settings/image_to_texts_helper.rb` (create if doesn't exist)

```ruby
module Settings
  module ImageToTextsHelper
    # Returns memory estimate for a given model
    def model_memory_estimate(model_name)
      memory_map = {
        "Florence-2-base" => "~460MB",
        "Florence-2-base-int4" => "~115MB",
        "Florence-2-large" => "~1.5GB",
        "Florence-2-large-int4" => "~385MB",
        "SmolVLM-256M-Instruct" => "~500MB",
        "SmolVLM-256M-Instruct-int8" => "~256MB",
        "SmolVLM-500M-Instruct" => "~1.8GB",
        "SmolVLM-500M-Instruct-int8" => "~500MB",
        "moondream2" => "~5GB",
        "moondream2-int8" => "~1.5GB"
      }
      memory_map[model_name] || "Unknown"
    end

    # Returns badge color class for quantized models
    def quantization_badge_class(model_name)
      if model_name.include?("int4")
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      elsif model_name.include?("int8")
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      else
        "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
      end
    end

    # Returns quantization type label
    def quantization_label(model_name)
      if model_name.include?("int4")
        "INT4 Optimized"
      elsif model_name.include?("int8")
        "INT8 Optimized"
      else
        "Full Precision"
      end
    end
  end
end
```

### Step 3.3: Update View Template

**File**: `meme_search/meme_search_app/app/views/settings/image_to_texts/index.html.erb`

**Enhance model card** (around line 17-64):

```erb
<% @image_to_texts.each do |image_to_text| %>
  <div class="<%= 'ring-2 ring-indigo-500' if image_to_text.current %> relative overflow-hidden rounded-2xl bg-white/10 dark:bg-gray-900/10 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.25)] transition-all duration-300 p-6 hover:scale-[1.02]">

    <!-- Header with badges -->
    <div class="flex items-start justify-between mb-3">
      <div class="flex-1">
        <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">
          <%= image_to_text.name %>
        </h3>

        <!-- Badges row -->
        <div class="flex flex-wrap gap-2 mb-3">
          <!-- Memory badge -->
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            💾 <%= model_memory_estimate(image_to_text.name) %>
          </span>

          <!-- Quantization badge -->
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium <%= quantization_badge_class(image_to_text.name) %>">
            <%= quantization_label(image_to_text.name) %>
          </span>

          <!-- Experimental badge (for INT4) -->
          <% if image_to_text.name.include?("int4") %>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              ⚠️ Experimental
            </span>
          <% end %>
        </div>
      </div>

      <!-- Active badge (existing) -->
      <% if image_to_text.current %>
        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 ml-3">
          <svg class="mr-1.5 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
          </svg>
          Active
        </span>
      <% end %>
    </div>

    <!-- Description (existing, but now enhanced from seeds) -->
    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
      <%= image_to_text.description %>
    </p>

    <!-- ... rest of card (learn more link, toggle, etc.) ... -->
  </div>
<% end %>
```

### Step 3.4: Add Help Section

**File**: `meme_search/meme_search_app/app/views/settings/image_to_texts/index.html.erb`

**Add before model cards** (after line 10):

```erb
<!-- Help section -->
<div class="mb-6 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
  <div class="flex">
    <div class="flex-shrink-0">
      <svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
      </svg>
    </div>
    <div class="ml-3 flex-1">
      <h3 class="text-sm font-medium text-blue-800 dark:text-blue-200">
        Understanding Model Options
      </h3>
      <div class="mt-2 text-sm text-blue-700 dark:text-blue-300">
        <p class="mb-2"><strong>Full Precision</strong> (FP16/BF16): Original model weights, highest quality, more memory.</p>
        <p class="mb-2"><strong>INT8 Optimized</strong>: 8-bit quantization, ~50% memory reduction, minimal quality loss (0-5%). Proven for SmolVLM and Moondream.</p>
        <p><strong>INT4 Optimized</strong>: 4-bit quantization, ~75% memory reduction, slight quality loss (5-10%). Recommended by Microsoft for Florence models. Validate quality for your use case.</p>
      </div>
    </div>
  </div>
</div>
```

### Step 3.5: Update E2E Tests

**File**: `playwright/tests/image-to-texts.spec.ts`

**Update model count** (currently expects 6, now 10):

```typescript
test('displays the image to text settings heading', async ({ page }) => {
  await imageToTextsPage.goto();
  expect(await imageToTextsPage.heading()).toBe('AI Models');

  // Verify 10 models are displayed (was 6)
  const modelCards = await page.locator('.rounded-2xl').count();
  expect(modelCards).toBe(10);
});

test('updating the current model to all available models', async ({ page }) => {
  await imageToTextsPage.goto();

  // Update model IDs to include new quantized variants
  // Assuming IDs 1-10 (Florence-2-base is 1, new models get sequential IDs)
  const modelIds = [2, 3, 4, 5, 6, 7, 8, 9, 10, 1]; // Test all, end with default
  const allIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  for (const modelId of modelIds) {
    await imageToTextsPage.selectModel(modelId);
    await imageToTextsPage.saveSelection();

    expect(await imageToTextsPage.isModelSelected(modelId)).toBe(true);

    // Verify exclusive selection (only one active)
    for (const otherId of allIds) {
      if (otherId !== modelId) {
        expect(await imageToTextsPage.isModelSelected(otherId)).toBe(false);
      }
    }
  }
});
```

### Step 3.6: Update README.md

**File**: `README.md`

**Add memory comparison table** (in Models section):

```markdown
## AI Models

Meme Search supports multiple vision-language models with different memory requirements:

### Memory Comparison

| Model | Parameters | Precision | Memory | Quality | Best For |
|-------|-----------|-----------|--------|---------|----------|
| Florence-2-base | 250M | FP16 | ~460MB | Baseline | GPU, balanced |
| Florence-2-base | 250M | INT4 | **~115MB** | 90-95% | Ultra-low memory |
| Florence-2-large | 700M | FP16 | ~1.5GB | High | GPU, quality |
| Florence-2-large | 700M | INT4 | **~385MB** | 90-95% | Limited GPU |
| SmolVLM-256M | 256M | BF16 | ~500MB | Baseline | Compact |
| SmolVLM-256M | 256M | INT8 | **~256MB** | 99%+ | CPU/laptop |
| SmolVLM-500M | 500M | BF16 | ~1.8GB | Enhanced | GPU/high-mem CPU |
| SmolVLM-500M | 500M | INT8 | **~500MB** | 99%+ | CPU quality |
| Moondream2 | 1.9B | FP16 | ~5GB | Highest | GPU 6GB+ |
| Moondream2 | 1.9B | INT8 | **~1.5GB** | 95-100% | CPU/limited GPU |

### Quantization Methods

- **INT8**: 8-bit integer quantization, ~50% memory reduction, minimal quality loss (0-5%)
- **INT4**: 4-bit integer quantization, ~75% memory reduction, slight quality loss (5-10%)

### Hardware Recommendations

**<512MB available:**
- Florence-2-base-int4 (~115MB) ⭐ Recommended

**512MB-1GB available:**
- SmolVLM-256M-int8 (~256MB)
- Florence-2-large-int4 (~385MB)

**1-2GB available:**
- SmolVLM-500M-int8 (~500MB)
- Moondream2-int8 (~1.5GB) ⭐ Best quality in this range

**2-4GB available:**
- Florence-2-large (~1.5GB)
- Moondream2-int8 (~1.5GB)

**4GB+ available:**
- Moondream2 (~5GB) ⭐ Best overall quality
```

### Step 3.7: Update CLAUDE.md

**File**: `CLAUDE.md`

**Add quantization patterns section**:

```markdown
## Quantization Patterns

### Adding Quantized Model Variants

Follow the established pattern from `MoondreamQuantizedImageToText`:

**INT8 Pattern** (for most models):
```python
from transformers import BitsAndBytesConfig

quantization_config = BitsAndBytesConfig(
    load_in_8bit=True,
    llm_int8_threshold=6.0,
)

model = AutoModelForCausalLM.from_pretrained(
    "model/name",
    quantization_config=quantization_config,
    device_map="auto",  # Required - don't use .to(device)
    trust_remote_code=True
)
```

**INT4 Pattern** (for Florence-2 or aggressive compression):
```python
import torch
from transformers import BitsAndBytesConfig

quantization_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4"
)

model = AutoModelForCausalLM.from_pretrained(
    "model/name",
    quantization_config=quantization_config,
    device_map="auto",
    trust_remote_code=True
)
```

**Key Constraints:**
- Cannot call `.to(device)` after loading with quantization
- Must use `device_map="auto"` - BitsAndBytes manages device placement
- No torch_dtype parameter needed - quantization config handles it
- GPU-only (NVIDIA/AMD, no MPS support)
```

## Testing Checklist

### Rails Tests
- [ ] Update model count in seeds: 6 → 10 models
- [ ] Run `mise exec -- bin/rails db:seed:replant` (test environment)
- [ ] Verify 10 ImageToText records created
- [ ] Check descriptions include hardware recommendations

### E2E Tests
- [ ] Update `image-to-texts.spec.ts` for 10 models
- [ ] Run `npm run test:e2e -- image-to-texts.spec.ts`
- [ ] Verify all model selection tests pass
- [ ] Check new badges are visible in UI

### UI Manual Testing
- [ ] Navigate to Settings > AI Models
- [ ] Verify 10 models displayed with badges
- [ ] Check memory estimates are correct
- [ ] Verify INT4 models show "Experimental" badge
- [ ] Verify INT8 models show "INT8 Optimized" badge
- [ ] Check help section displays correctly
- [ ] Test model selection and save
- [ ] Verify dark mode styling

### Documentation
- [ ] README.md updated with memory table
- [ ] CLAUDE.md updated with quantization patterns
- [ ] Hardware recommendations are clear
- [ ] Links work correctly

## Expected Outcomes

### UI Improvements
- ✅ Clear memory information on each model card
- ✅ Visual distinction between FP16/INT8/INT4 variants
- ✅ User education section explaining quantization
- ✅ Experimental warnings for INT4 models

### Documentation
- ✅ Complete memory comparison table in README
- ✅ Hardware recommendations for different RAM constraints
- ✅ Code patterns documented in CLAUDE.md
- ✅ Clear explanation of INT4 vs INT8 trade-offs

### Tests
- ✅ E2E tests updated for 10 models
- ✅ All tests passing
- ✅ UI renders correctly in browser testing

## Completion Criteria

- [ ] Rails helper methods implemented
- [ ] View template enhanced with badges
- [ ] Help section added to UI
- [ ] E2E tests updated and passing
- [ ] README.md memory table added
- [ ] CLAUDE.md quantization patterns documented
- [ ] Manual UI testing complete
- [ ] All 10 models selectable and functional

## Next Phase

After Phase 3 completion, proceed to **Phase 4: Final Validation & Deployment** (final testing, Docker builds, release preparation).
