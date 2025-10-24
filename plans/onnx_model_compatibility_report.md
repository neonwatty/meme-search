# ONNX Model Compatibility Report for Meme-Search

## Executive Summary

After investigating ONNX support for all image-to-text models currently used in meme-search, I found that **ONNX support is partial and requires workarounds**. While community ONNX versions exist for all models, official support through standard tools is limited or non-existent.

## Model-by-Model ONNX Status

### 1. Florence-2 Models (Microsoft)
**Models:** Florence-2-base, Florence-2-large
**Official ONNX Support:** ❌ No
**Community ONNX Support:** ✅ Yes
**Status:**
- Standard `optimum-cli export` fails with `ValueError` - Florence2Config not supported
- Community ONNX versions available at `onnx-community/Florence-2-base` and `onnx-community/Florence-2-large`
- Compatible with Transformers.js (requires v3 from source)
- Issue tracked at microsoft/onnxruntime#21118 since June 2024

### 2. SmolVLM Models (HuggingFace)
**Models:** SmolVLM-256M-Instruct, SmolVLM-500M-Instruct
**Official ONNX Support:** ✅ Yes
**Community ONNX Support:** ✅ Yes
**Status:**
- **Best ONNX support** among all models
- Can be loaded directly to transformers, MLX, and ONNX
- WebGPU demos available with ONNX
- Excellent performance: 2-3k tokens/second on MacBook Pro M1/M2
- ONNX files include: `vision_encoder.onnx`, `embed_tokens.onnx`, `decoder_model_merged.onnx`

### 3. Moondream2
**Model:** moondream2
**Official ONNX Support:** ❌ No
**Community ONNX Support:** ✅ Yes (with limitations)
**Status:**
- Standard conversion tools fail - custom architecture not supported
- Community versions available:
  - `Xenova/moondream2` (ONNX subfolder)
  - `vikhyatk/moondream2` (onnx branch with quantized versions)
  - `onnx-community/moondream2.text_model-ONNX` (text component only)
- Requires custom export configuration

## Implications for Rails Monolith Plan

### ⚠️ Critical Finding
**The original Rails monolith plan's assumption of easy ONNX integration needs revision.** Direct ONNX support is not straightforward for most models.

### Recommended Approaches (In Order of Preference)

#### 1. **Hybrid Approach: Keep Python Subprocess** (Recommended)
Instead of eliminating Python entirely, use a lightweight Python subprocess:

```ruby
# app/services/ml/python_bridge.rb
class ML::PythonBridge
  def initialize(model_name)
    @model_name = model_name
    @python_script = Rails.root.join('lib/ml/inference.py')
  end

  def process_image(image_path)
    result = Open3.capture3(
      'python', @python_script.to_s,
      '--model', @model_name,
      '--image', image_path
    )
    JSON.parse(result[0])
  end
end
```

**Pros:**
- Works with all current models without modification
- Minimal changes to existing ML pipeline
- Can gradually migrate to ONNX as support improves
- Maintains model accuracy

**Cons:**
- Still requires Python runtime
- Not a "pure" Rails monolith

#### 2. **Use Only SmolVLM Models**
Standardize on SmolVLM-256M or SmolVLM-500M which have the best ONNX support:

```javascript
// lib/ml/smolvlm_inference.js
const ort = require('onnxruntime-node');

async function runInference(imagePath) {
  const session = await ort.InferenceSession.create('./models/SmolVLM-256M.onnx');
  // Process image with ONNX runtime
}
```

**Pros:**
- True ONNX integration possible
- Excellent performance (256M model runs at hundreds of examples/sec on A100)
- Small model size ideal for deployment

**Cons:**
- Loses access to Florence-2 and Moondream2 models
- May impact caption quality for some use cases

#### 3. **Use Community ONNX Versions**
Use the community-provided ONNX exports with careful testing:

```ruby
# config/ml_models.yml
models:
  florence_2_base:
    source: "onnx-community/Florence-2-base"
    type: "community_onnx"
    fallback: "python_subprocess"

  smolvlm_256m:
    source: "HuggingFaceTB/SmolVLM-256M-Instruct"
    type: "official_onnx"
```

**Pros:**
- Can use ONNX for most models
- Fallback to Python when needed

**Cons:**
- Community versions may have issues
- Requires extensive testing
- Version management complexity

#### 4. **External API Approach**
Use cloud inference APIs instead of local models:

```ruby
# app/services/ml/api_inference.rb
class ML::APIInference
  def process_image(image_path)
    # Use Replicate, HuggingFace Inference, or OpenAI Vision API
    client.predict(
      model: "microsoft/florence-2-large",
      image: File.open(image_path)
    )
  end
end
```

**Pros:**
- No local ML infrastructure needed
- Always latest model versions
- Scales automatically

**Cons:**
- Requires internet connection
- API costs
- Privacy concerns (images sent to cloud)
- Latency issues

## Updated Architecture Recommendation

### Modified Rails Monolith with Lightweight Python Sidecar

```yaml
# docker-compose.yml
services:
  rails_app:
    build: .
    volumes:
      - ./app:/app
      - ./memes:/app/public/memes
    depends_on:
      - ml_sidecar
      - postgres
      - redis

  ml_sidecar:
    build: ./ml_sidecar
    # Minimal Python container with just inference code
    # ~500MB instead of 12GB
    volumes:
      - ./models:/models
      - ./memes:/memes:ro
    expose:
      - "5000"  # Internal API only
```

### Minimal Python Sidecar Design

```python
# ml_sidecar/app.py
from fastapi import FastAPI
from transformers import AutoProcessor, AutoModelForCausalLM
import uvicorn

app = FastAPI()

# Load models once at startup
models = {}

@app.post("/inference")
async def run_inference(model_name: str, image_path: str):
    model = models.get(model_name)
    if not model:
        model = load_model(model_name)
        models[model_name] = model

    result = model.generate(image_path)
    return {"description": result}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)
```

### Rails Integration

```ruby
# app/services/ml/inference_service.rb
class ML::InferenceService
  include HTTParty
  base_uri 'http://ml_sidecar:5000'

  def self.generate_description(image_path, model_name)
    response = post('/inference',
      body: {
        model_name: model_name,
        image_path: image_path
      }.to_json,
      headers: { 'Content-Type' => 'application/json' }
    )

    response.parsed_response['description']
  rescue StandardError => e
    Rails.logger.error "ML inference failed: #{e.message}"
    nil
  end
end
```

## Migration Strategy

### Phase 1: Minimal Changes (Week 1)
1. Keep current Python service
2. Refactor Rails app to monolith structure
3. Move Python service to lightweight FastAPI container

### Phase 2: ONNX Migration (Week 2-3)
1. Start with SmolVLM models (best ONNX support)
2. Test community ONNX versions of Florence-2
3. Keep Python fallback for unsupported models

### Phase 3: Progressive Enhancement (Week 4+)
1. Monitor ONNX support improvements
2. Migrate models as official support becomes available
3. Consider training custom lightweight models

## Risk Mitigation

1. **Test Model Accuracy**: Community ONNX exports may have different outputs
2. **Performance Benchmarking**: ONNX may be faster but accuracy could vary
3. **Fallback Strategy**: Always maintain Python subprocess as backup
4. **Gradual Migration**: Don't convert all models at once

## Conclusion

While the original plan to fully eliminate Python and use ONNX for all models is **not currently feasible**, a hybrid approach can achieve most of the simplification goals:

1. **Keep a minimal Python sidecar** instead of the current heavy two-server system
2. **Use ONNX where possible** (especially SmolVLM models)
3. **Progressively migrate** as ONNX support improves
4. **Maintain the Rails monolith** for all other functionality

This approach provides:
- ✅ Simpler architecture (one main Rails app + minimal ML sidecar)
- ✅ Better maintainability
- ✅ Flexibility to adopt ONNX gradually
- ✅ Preservation of all current model capabilities
- ✅ Lower risk migration path

The full "pure Rails monolith" vision can be achieved in the future as ONNX support for vision-language models matures.