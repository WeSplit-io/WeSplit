"""
Gestionnaire d'erreurs centralisé pour l'extraction de tickets de caisse.
"""
import sys
from typing import Any
from src.core.interfaces import ErrorHandlerInterface


class ErrorHandler(ErrorHandlerInterface):
    """Gestionnaire d'erreurs centralisé."""

    def handle_image_processing_error(self, error: Exception) -> dict[str, Any]:
        """
        Gère les erreurs de traitement d'image.
        """
        return {
            "success": False,
            "error": f"Erreur de traitement image : {str(error)}",
            "data": None
        }

    def handle_api_error(self, error: Exception) -> dict[str, Any]:
        """
        Gère les erreurs de l'API.
        """
        return {
            "success": False,
            "error": f"Erreur API : {str(error)}",
            "data": None
        }

    def handle_parsing_error(self, error: Exception, raw_response: str) -> dict[str, Any]:
        """
        Gère les erreurs de parsing.
        """
        result = {
            "success": False,
            "error": f"Erreur de parsing : {str(error)}",
            "data": None
        }
        
        if raw_response:
            result["raw_response"] = raw_response
            
        return result

    def handle_validation_error(self, error: Exception) -> dict[str, Any]:
        """
        Gère les erreurs de validation.
        """
        return {
            "success": False,
            "error": f"Erreur validation : {str(error)}",
            "data": None
        }

    def handle_api_validation_error(self, error: Exception) -> dict[str, Any]:
        """
        Gère les erreurs de l'API lors de la validation.
        """
        return {
            "success": False,
            "error": f"Erreur API validation : {str(error)}",
            "data": None
        }

    def handle_api_extraction_error(self, error: Exception) -> dict[str, Any]:
        """
        Gère les erreurs de l'API lors de l'extraction.
        """
        return {
            "success": False,
            "error": f"Erreur API extraction : {str(error)}",
            "data": None
        }