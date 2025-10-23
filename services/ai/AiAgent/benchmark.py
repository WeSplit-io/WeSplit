"""
Script de benchmark pour mesurer les performances de l'extraction de tickets de caisse.
"""
import sys
from pathlib import Path
import time
import asyncio
from unittest.mock import Mock, patch

# Ajoute le répertoire racine au PYTHONPATH pour les imports absolus
sys.path.insert(0, str(Path(__file__).resolve().parent))

from src.core.extraction_orchestrator import ExtractionOrchestrator
from src.api.openrouter_client import OpenRouterClient
from src.utils.image_processor import ImageProcessor
from src.utils.prompt_builder import PromptBuilder
from src.core.response_parser import ResponseParser
from src.core.error_handler import ErrorHandler
from src.core.json_formatter import ReceiptData


async def benchmark_extraction(image_path: str, iterations: int = 5) -> float:
    """Mesure le temps d'exécution moyen de l'extraction."""
    # Crée des mocks pour les dépendances externes
    mock_api_client = Mock(spec=OpenRouterClient)
    mock_api_client.analyze_receipt.return_value = {
        "success": True,
        "content": '{"store_name": "Mock Store", "total": 10.0, "currency": "EUR", "items": [{"name": "Item 1", "price": 5.0}]}',
        "usage": {"total_tokens": 100},
        "metrics": {"generation_time_ms": 500}
    }
    
    mock_image_processor = Mock(spec=ImageProcessor)
    mock_image_processor.process_image_in_memory.return_value = (b"mock_image_bytes", "image/jpeg")
    
    mock_prompt_builder = Mock(spec=PromptBuilder)
    mock_prompt_builder.build_extraction_prompt.return_value = "Mock prompt"
    
    mock_response_parser = Mock(spec=ResponseParser)
    mock_response_parser.extract_json_from_response.return_value = '{"store_name": "Mock Store", "total": 10.0, "currency": "EUR", "items": [{"name": "Item 1", "price": 5.0}]}'
    
    mock_error_handler = Mock(spec=ErrorHandler)
    mock_error_handler.handle_image_processing_error.return_value = {"success": False, "error": "Erreur de traitement d'image"}
    mock_error_handler.handle_api_error.return_value = {"success": False, "error": "Erreur API"}
    mock_error_handler.handle_parsing_error.return_value = {"success": False, "error": "Erreur de parsing"}
    mock_error_handler.handle_api_validation_error.return_value = {"success": False, "error": "Erreur de validation API"}
    mock_error_handler.handle_validation_error.return_value = {"success": False, "error": "Erreur de validation"}
    mock_error_handler.handle_api_extraction_error.return_value = {"success": False, "error": "Erreur d'extraction API"}
    
    # Mock pour parse_receipt_json
    mock_receipt_data = Mock(spec=ReceiptData)
    mock_receipt_data.model_dump.return_value = {
        "store_name": "Mock Store",
        "total": 10.0,
        "currency": "EUR",
        "items": [{"name": "Item 1", "price": 5.0}]
    }
    
    # Patch parse_receipt_json pour retourner notre mock
    with patch('src.core.extraction_orchestrator.parse_receipt_json', return_value=mock_receipt_data):
        # Crée l'orchestrateur avec injection de dépendances
        extractor = ExtractionOrchestrator(
            api_client=mock_api_client,
            image_processor=mock_image_processor,
            prompt_builder=mock_prompt_builder,
            response_parser=mock_response_parser,
            error_handler=mock_error_handler
        )
        
        total_time = 0.0
        
        for i in range(iterations):
            print(f"Exécution {i+1}/{iterations}...")
            start_time = time.perf_counter()
            
            result = await extractor.extract(image_path=image_path)
            
            end_time = time.perf_counter()
            execution_time = end_time - start_time
            total_time += execution_time
            
            if not result["success"]:
                print(f"Erreur lors de l'extraction : {result.get('error', 'Erreur inconnue')}")
                # On continue le benchmark même en cas d'erreur
            
            print(f"  Temps d'exécution : {execution_time:.3f} secondes")
        
        # Nettoie la session client
        await extractor.close_client_session()
        
        average_time = total_time / iterations
        return average_time


def main():
    """Fonction principale du benchmark."""
    image_path = "Dataset/FR1.jpg"
    iterations = 5
    
    print(f"=== BENCHMARK ===")
    print(f"Image : {image_path}")
    print(f"Nombre d'itérations : {iterations}")
    print(f"")
    
    average_time = asyncio.run(benchmark_extraction(image_path, iterations))
    
    print(f"")
    print(f"=== RESULTATS ===")
    print(f"Temps d'exécution moyen : {average_time:.3f} secondes")


if __name__ == "__main__":
    main()