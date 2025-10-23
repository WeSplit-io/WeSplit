#!/usr/bin/env python3
"""
Simple HTTP server for AI Agent integration with WeSplit
Provides REST API endpoint for bill analysis
"""

import os
import sys
import json
import base64
import asyncio
import logging
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile

# Add the project root to Python path
PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Import AI agent components
from src.core.extraction_orchestrator import ExtractionOrchestrator
from src.api.openrouter_client import OpenRouterClient
from src.utils.image_processor import ImageProcessor
from src.utils.prompt_builder import PromptBuilder
from src.core.response_parser import ResponseParser
from src.core.error_handler import ErrorHandler

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for React Native app

# Configure Flask to handle large payloads
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max payload

# Global AI agent instance
ai_agent = None

def initialize_ai_agent():
    """Initialize the AI agent components"""
    global ai_agent
    
    try:
        # Check for API key
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY environment variable is required")
        
        # Initialize components
        api_client = OpenRouterClient(api_key=api_key)
        image_processor = ImageProcessor()
        prompt_builder = PromptBuilder()
        response_parser = ResponseParser()
        error_handler = ErrorHandler()
        
        # Create orchestrator
        ai_agent = ExtractionOrchestrator(
            api_client=api_client,
            image_processor=image_processor,
            prompt_builder=prompt_builder,
            response_parser=response_parser,
            error_handler=error_handler
        )
        
        logger.info("AI Agent initialized successfully")
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize AI Agent: {e}")
        return False

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'ai_agent_ready': ai_agent is not None,
        'api_key_configured': bool(os.getenv("OPENROUTER_API_KEY"))
    })

@app.route('/analyze-bill', methods=['POST'])
def analyze_bill():
    """Analyze bill image and return structured data"""
    try:
        if not ai_agent:
            return jsonify({
                'success': False,
                'error': 'AI Agent not initialized'
            }), 500
        
        # Log request info
        content_length = request.content_length
        logger.info(f"Received analyze-bill request, content length: {content_length} bytes")
        
        if content_length and content_length > 10 * 1024 * 1024:  # 10MB
            logger.warning(f"Large payload received: {content_length} bytes")
        
        # Get image data from request
        if 'image' in request.files:
            # Handle file upload
            image_file = request.files['image']
            if not image_file:
                return jsonify({
                    'success': False,
                    'error': 'No image file provided'
                }), 400
            
            # Save to temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
                image_file.save(temp_file.name)
                image_path = temp_file.name
        elif 'imageData' in request.json:
            # Handle base64 encoded image (preferred for React Native)
            image_data = request.json['imageData']
            logger.info(f"Received base64 data, length: {len(image_data)}")
            
            try:
                # Handle data URI format (data:image/jpeg;base64,...)
                if image_data.startswith('data:'):
                    # Remove data URL prefix
                    image_data = image_data.split(',')[1]
                    logger.info("Extracted base64 data from data URI")
                
                # Decode base64 to bytes
                image_bytes = base64.b64decode(image_data)
                logger.info(f"Decoded base64 to {len(image_bytes)} bytes")
                
                # Save to temporary file
                with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
                    temp_file.write(image_bytes)
                    image_path = temp_file.name
                    logger.info(f"Saved base64 image to: {image_path}")
                    
            except Exception as e:
                logger.error(f"Error processing base64 image: {e}")
                return jsonify({
                    'success': False,
                    'error': f'Invalid image data: {str(e)}'
                }), 400
        elif 'imageUri' in request.json:
            # Handle React Native file URI
            image_uri = request.json['imageUri']
            if image_uri.startswith('file://'):
                # Extract file path
                image_path = image_uri.replace('file://', '')
                # Check if file exists
                if not os.path.exists(image_path):
                    return jsonify({
                        'success': False,
                        'error': f'Image file not found: {image_path}'
                    }), 400
            else:
                return jsonify({
                    'success': False,
                    'error': 'Invalid image URI format'
                }), 400
        else:
            return jsonify({
                'success': False,
                'error': 'No image data provided. Expected: image (file), imageData (base64), or imageUri (file path)'
            }), 400
        
        # Process with AI agent
        logger.info(f"Processing image: {image_path}")
        
        # Run async function
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(ai_agent.extract(
                image_path=image_path,
                optimize_image=True,
                two_step=False  # Use one-shot mode for faster processing
            ))
        finally:
            loop.close()
            # Clean up temporary file
            try:
                os.unlink(image_path)
            except:
                pass
        
        # Check if processing was successful
        if not result.get('success', False):
            return jsonify({
                'success': False,
                'error': result.get('error', 'Unknown processing error')
            }), 500
        
        # Return successful result
        return jsonify({
            'success': True,
            'data': result.get('data', {}),
            'is_receipt': result.get('is_receipt', True),
            'processing_time': result.get('metrics', {}).get('generation_time_ms', 0) / 1000.0,
            'confidence': 0.95,  # Default confidence, could be calculated from AI response
            'usage': result.get('usage', {}),
            'raw_response': result.get('raw_response', '')
        })
        
    except Exception as e:
        logger.error(f"Error processing bill: {e}")
        return jsonify({
            'success': False,
            'error': f'Processing error: {str(e)}'
        }), 500

@app.route('/test', methods=['GET'])
def test_endpoint():
    """Test endpoint with sample image"""
    try:
        if not ai_agent:
            return jsonify({
                'success': False,
                'error': 'AI Agent not initialized'
            }), 500
        
        # Use a sample image from the dataset
        sample_image = PROJECT_ROOT / "Dataset" / "FR1.jpg"
        if not sample_image.exists():
            return jsonify({
                'success': False,
                'error': 'Sample image not found'
            }), 404
        
        logger.info(f"Testing with sample image: {sample_image}")
        
        # Process with AI agent
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(ai_agent.extract(
                image_path=str(sample_image),
                optimize_image=True,
                two_step=False
            ))
        finally:
            loop.close()
        
        if not result.get('success', False):
            return jsonify({
                'success': False,
                'error': result.get('error', 'Test processing failed')
            }), 500
        
        return jsonify({
            'success': True,
            'data': result.get('data', {}),
            'is_receipt': result.get('is_receipt', True),
            'processing_time': result.get('metrics', {}).get('generation_time_ms', 0) / 1000.0,
            'message': 'Test successful'
        })
        
    except Exception as e:
        logger.error(f"Test error: {e}")
        return jsonify({
            'success': False,
            'error': f'Test error: {str(e)}'
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500

def main():
    """Main function to start the server"""
    print("Starting AI Agent HTTP Server...")
    
    # Initialize AI agent
    if not initialize_ai_agent():
        print("ERROR: Failed to initialize AI Agent. Please check your configuration.")
        print("Make sure you have:")
        print("1. OPENROUTER_API_KEY environment variable set")
        print("2. All required dependencies installed")
        print("3. Valid API key from https://openrouter.ai/keys")
        sys.exit(1)
    
    # Start server
    port = int(os.getenv('PORT', 5000))
    host = os.getenv('HOST', '0.0.0.0')
    
    print(f"AI Agent server starting on {host}:{port}")
    print("Available endpoints:")
    print(f"  GET  http://{host}:{port}/health - Health check")
    print(f"  POST http://{host}:{port}/analyze-bill - Analyze bill image")
    print(f"  GET  http://{host}:{port}/test - Test with sample image")
    
    app.run(host=host, port=port, debug=True)

if __name__ == '__main__':
    main()
