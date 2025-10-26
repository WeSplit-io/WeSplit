#!/usr/bin/env python3
"""
Test script to verify AI agent setup without requiring API key
"""

import sys
from pathlib import Path

# Add the project root to Python path
PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))

def test_imports():
    """Test that all required modules can be imported"""
    print("Testing imports...")
    
    try:
        from src.core.extraction_orchestrator import ExtractionOrchestrator
        print("SUCCESS: ExtractionOrchestrator imported successfully")
    except ImportError as e:
        print(f"ERROR: Failed to import ExtractionOrchestrator: {e}")
        return False
    
    try:
        from src.api.openrouter_client import OpenRouterClient
        print("SUCCESS: OpenRouterClient imported successfully")
    except ImportError as e:
        print(f"ERROR: Failed to import OpenRouterClient: {e}")
        return False
    
    try:
        from src.utils.image_processor import ImageProcessor
        print("SUCCESS: ImageProcessor imported successfully")
    except ImportError as e:
        print(f"ERROR: Failed to import ImageProcessor: {e}")
        return False
    
    try:
        from src.utils.prompt_builder import PromptBuilder
        print("SUCCESS: PromptBuilder imported successfully")
    except ImportError as e:
        print(f"ERROR: Failed to import PromptBuilder: {e}")
        return False
    
    try:
        from src.core.response_parser import ResponseParser
        print("SUCCESS: ResponseParser imported successfully")
    except ImportError as e:
        print(f"ERROR: Failed to import ResponseParser: {e}")
        return False
    
    try:
        from src.core.error_handler import ErrorHandler
        print("SUCCESS: ErrorHandler imported successfully")
    except ImportError as e:
        print(f"ERROR: Failed to import ErrorHandler: {e}")
        return False
    
    return True

def test_config():
    """Test configuration loading"""
    print("\nTesting configuration...")
    
    try:
        from src.config.app_config import settings
        print("SUCCESS: Configuration loaded successfully")
        print(f"   Model: {settings.api.model}")
        print(f"   Max tokens: {settings.api.one_shot_max_tokens}")
        print(f"   Image max size: {settings.image.max_width}x{settings.image.max_height}")
        return True
    except Exception as e:
        print(f"ERROR: Failed to load configuration: {e}")
        return False

def test_image_processing():
    """Test image processing capabilities"""
    print("\nTesting image processing...")
    
    try:
        from src.utils.image_processor import ImageProcessor
        processor = ImageProcessor()
        
        # Check if we have test images
        dataset_dir = PROJECT_ROOT / "Dataset"
        if dataset_dir.exists():
            image_files = list(dataset_dir.glob("*.jpg"))
            if image_files:
                print(f"SUCCESS: Found {len(image_files)} test images in Dataset/")
                print(f"   Sample: {image_files[0].name}")
                return True
            else:
                print("WARNING: No test images found in Dataset/")
                return False
        else:
            print("WARNING: Dataset directory not found")
            return False
    except Exception as e:
        print(f"ERROR: Failed to test image processing: {e}")
        return False

def test_api_key_requirement():
    """Test that API key is required for actual processing"""
    print("\nTesting API key requirement...")
    
    try:
        from src.api.openrouter_client import OpenRouterClient
        
        # This should fail without API key
        try:
            client = OpenRouterClient()
            print("WARNING: OpenRouterClient created without API key (unexpected)")
            return False
        except ValueError as e:
            if "Clé API OpenRouter requise" in str(e) or "API key" in str(e):
                print("SUCCESS: API key requirement properly enforced")
                return True
            else:
                print(f"ERROR: Unexpected error: {e}")
                return False
    except Exception as e:
        print(f"ERROR: Failed to test API key requirement: {e}")
        return False

def main():
    """Run all tests"""
    print("AI Agent Setup Test")
    print("=" * 50)
    
    tests = [
        test_imports,
        test_config,
        test_image_processing,
        test_api_key_requirement
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print("=" * 50)
    print(f"Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("SUCCESS: All tests passed! AI agent is ready for setup.")
        print("\nNext steps:")
        print("1. Get OpenRouter API key from: https://openrouter.ai/keys")
        print("2. Create .env file with: OPENROUTER_API_KEY=your_key_here")
        print("3. Test with: py src/main.py Dataset/FR1.jpg --pretty")
    else:
        print("ERROR: Some tests failed. Please check the errors above.")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
