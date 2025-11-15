#!/usr/bin/env python3
"""
Test script to evaluate quantized Moondream2 model for meme captioning.

This script tests INT8 quantization using BitsAndBytes to reduce memory footprint
from ~5GB (FP16) to ~1.5-2GB (INT8) for CPU-constrained hardware.

Usage:
    python test_quantized_moondream.py
"""

import os
import sys
import time
from pathlib import Path
from PIL import Image
import torch
from transformers import AutoModelForCausalLM
import psutil

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))


def get_memory_usage():
    """Get current process memory usage in MB."""
    process = psutil.Process(os.getpid())
    return process.memory_info().rss / 1024 / 1024


def test_quantized_moondream():
    """Test quantized Moondream2 model with sample image."""

    print("=" * 80)
    print("Testing Quantized Moondream2 for Meme Captioning")
    print("=" * 80)

    # Determine device
    if torch.backends.mps.is_available():
        device = "mps"
    elif torch.cuda.is_available():
        device = "cuda"
    else:
        device = "cpu"

    print(f"\n1. Device: {device}")
    print(f"   PyTorch version: {torch.__version__}")

    initial_memory = get_memory_usage()
    print(f"   Initial memory: {initial_memory:.2f} MB")

    # Test 1: Load regular FP16/FP32 model
    print("\n" + "-" * 80)
    print("Test 1: Regular Moondream2 (FP16/FP32)")
    print("-" * 80)

    try:
        start_time = time.time()
        torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

        model_fp = AutoModelForCausalLM.from_pretrained(
            "vikhyatk/moondream2",
            revision="2025-01-09",
            trust_remote_code=True,
            torch_dtype=torch_dtype
        ).to(device)

        load_time_fp = time.time() - start_time
        memory_fp = get_memory_usage() - initial_memory

        print(f"✓ Loaded in {load_time_fp:.2f}s")
        print(f"✓ Memory usage: {memory_fp:.2f} MB ({torch_dtype})")

        # Test caption
        test_image_path = Path(__file__).parent.parent.parent / "meme_search" / "meme_search_app" / "test" / "fixtures" / "files" / "test_image_1.jpg"

        if test_image_path.exists():
            image = Image.open(test_image_path)
            print(f"✓ Loaded test image: {test_image_path.name}")

            start_time = time.time()
            caption_fp = model_fp.caption(image, length="short")["caption"]
            inference_time_fp = time.time() - start_time

            print(f"✓ Caption: {caption_fp}")
            print(f"✓ Inference time: {inference_time_fp:.2f}s")
        else:
            print(f"⚠ Test image not found: {test_image_path}")

        # Clean up
        del model_fp
        torch.cuda.empty_cache() if torch.cuda.is_available() else None

    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()

    # Test 2: Try INT8 quantization with BitsAndBytes
    print("\n" + "-" * 80)
    print("Test 2: Quantized Moondream2 (INT8 with BitsAndBytes)")
    print("-" * 80)

    try:
        # Check if bitsandbytes is available
        import bitsandbytes
        print(f"✓ BitsAndBytes version: {bitsandbytes.__version__}")

        from transformers import BitsAndBytesConfig

        quantization_config = BitsAndBytesConfig(
            load_in_8bit=True,
            llm_int8_threshold=6.0,
        )

        start_time = time.time()

        # IMPORTANT: Don't call .to(device) after loading with load_in_8bit=True
        # The device_map parameter handles placement automatically
        model_int8 = AutoModelForCausalLM.from_pretrained(
            "vikhyatk/moondream2",
            revision="2025-01-09",
            trust_remote_code=True,
            quantization_config=quantization_config,
            device_map="auto",  # Let bitsandbytes handle device placement
        )

        load_time_int8 = time.time() - start_time
        memory_int8 = get_memory_usage() - initial_memory

        print(f"✓ Loaded in {load_time_int8:.2f}s")
        print(f"✓ Memory usage: {memory_int8:.2f} MB (INT8)")
        print(f"✓ Memory reduction: {((memory_fp - memory_int8) / memory_fp * 100):.1f}%")

        # Test caption
        if test_image_path.exists():
            image = Image.open(test_image_path)

            start_time = time.time()
            caption_int8 = model_int8.caption(image, length="short")["caption"]
            inference_time_int8 = time.time() - start_time

            print(f"✓ Caption: {caption_int8}")
            print(f"✓ Inference time: {inference_time_int8:.2f}s")
            print(f"✓ Speed comparison: {(inference_time_fp / inference_time_int8):.2f}x")

            # Compare quality
            if caption_fp == caption_int8:
                print("✓ Output identical to FP16/FP32")
            else:
                print(f"⚠ Output differs from FP16/FP32")
                print(f"  FP16/FP32: {caption_fp}")
                print(f"  INT8:      {caption_int8}")

        # Clean up
        del model_int8
        torch.cuda.empty_cache() if torch.cuda.is_available() else None

    except ImportError:
        print("✗ BitsAndBytes not installed")
        print("  To install: pip install bitsandbytes")
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()

    # Test 3: Try PyTorch native dynamic quantization (CPU-friendly)
    print("\n" + "-" * 80)
    print("Test 3: PyTorch Native Dynamic Quantization (CPU-friendly)")
    print("-" * 80)

    try:
        start_time = time.time()

        # Load model in FP32 for quantization
        model_dynamic = AutoModelForCausalLM.from_pretrained(
            "vikhyatk/moondream2",
            revision="2025-01-09",
            trust_remote_code=True,
            torch_dtype=torch.float32
        )

        # Apply dynamic quantization (works on CPU)
        model_dynamic_quant = torch.quantization.quantize_dynamic(
            model_dynamic,
            {torch.nn.Linear},  # Quantize Linear layers
            dtype=torch.qint8
        )

        load_time_dynamic = time.time() - start_time
        memory_dynamic = get_memory_usage() - initial_memory

        print(f"✓ Loaded and quantized in {load_time_dynamic:.2f}s")
        print(f"✓ Memory usage: {memory_dynamic:.2f} MB (dynamic INT8)")

        # Note: This may not work with moondream's custom code
        # Moondream uses custom implementations that may not support quantization
        print("⚠ Note: Dynamic quantization may not be compatible with Moondream's custom code")

    except Exception as e:
        print(f"✗ Error: {e}")
        print("  Dynamic quantization may not be compatible with this model")

    print("\n" + "=" * 80)
    print("Summary")
    print("=" * 80)
    print(f"Regular FP16/FP32: {memory_fp:.2f} MB, {inference_time_fp:.2f}s")
    try:
        print(f"INT8 (BitsAndBytes): {memory_int8:.2f} MB, {inference_time_int8:.2f}s")
        print(f"Memory savings: {memory_fp - memory_int8:.2f} MB ({((memory_fp - memory_int8) / memory_fp * 100):.1f}%)")
    except NameError:
        print("INT8 (BitsAndBytes): Not tested")
    print("=" * 80)


if __name__ == "__main__":
    test_quantized_moondream()
