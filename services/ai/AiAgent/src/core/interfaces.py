"""
Interfaces (protocoles) pour l'inversion des dépendances (DIP).
"""
from typing import Protocol, Any, Tuple, runtime_checkable


@runtime_checkable
class APIClientInterface(Protocol):
    """Interface pour le client API."""

    async def analyze_receipt(
        self,
        image_bytes: bytes,
        mime_type: str,
        prompt: str,
        max_tokens: int,
    ) -> dict[str, Any]:
        """Analyse un ticket de caisse."""
        ...

    async def close(self) -> None:
        """Ferme la session du client."""
        ...


@runtime_checkable
class ImageProcessorInterface(Protocol):
    """Interface pour le processeur d'images."""

    async def process_image_in_memory(self, image_path: str, optimize: bool = True) -> Tuple[bytes, str]:
        """Prépare une image en mémoire."""
        ...


@runtime_checkable
class PromptBuilderInterface(Protocol):
    """Interface pour le constructeur de prompts."""

    def build_prompt(self, include_validation: bool = True) -> str:
        """Construit le prompt d'extraction."""
        ...

    def build_extraction_prompt(self, include_validation: bool = True) -> str:
        """Construit le prompt d'extraction complète."""
        ...

    def build_validation_only_prompt(self) -> str:
        """Construit le prompt de validation seule."""
        ...


@runtime_checkable
class JSONFormatterInterface(Protocol):
    """Interface pour le formatteur JSON."""

    def format_json(self, json_str: str) -> Any:
        """Formate et valide le JSON."""
        ...


@runtime_checkable
class ResponseParserInterface(Protocol):
    """Interface pour le parseur de réponse."""

    def extract_json_from_response(self, response_text: str) -> str:
        """Extrait une chaîne JSON valide d'un texte."""
        ...


@runtime_checkable
class ErrorHandlerInterface(Protocol):
    """Interface pour le gestionnaire d'erreurs."""

    def handle_image_processing_error(self, error: Exception) -> dict[str, Any]:
        """Gère les erreurs de traitement d'image."""
        ...

    def handle_api_error(self, error: Exception) -> dict[str, Any]:
        """Gère les erreurs de l'API."""
        ...

    def handle_api_validation_error(self, error: Exception) -> dict[str, Any]:
        """Gère les erreurs de l'API lors de la validation."""
        ...

    def handle_api_extraction_error(self, error: Exception) -> dict[str, Any]:
        """Gère les erreurs de l'API lors de l'extraction."""
        ...

    def handle_validation_error(self, error: Exception) -> dict[str, Any]:
        """Gère les erreurs de validation."""
        ...

    def handle_parsing_error(self, error: Exception, raw_response: str) -> dict[str, Any]:
        """Gère les erreurs de parsing."""
        ...