"""
Module de configuration centralisé utilisant Pydantic pour la validation
et un fichier JSON externe pour les valeurs.
"""
import json
from pathlib import Path
from typing import List, Optional

from pydantic import BaseModel, Field


# --- Définition des modèles de configuration ---
# Configuration spécifique à OpenRouter, définie avant son utilisation
class OpenRouterConfig(BaseModel):
    """Configuration pour OpenRouter."""
    base_url: str = Field(default="https://openrouter.ai/api/v1", description="Base URL de l'API OpenRouter.")
    generation_path: str = Field(default="/generation", description="Chemin pour récupérer les stats de génération.")
    response_format_type: str = Field(default="json_object", description="Format de réponse de l'API.")

class APIConfig(BaseModel):
    """Configuration pour l'API OpenRouter."""
    model: str = Field(default="meta-llama/llama-4-scout", description="Modèle à utiliser pour l'extraction.")
    provider: Optional[str] = Field(default=None, description="Fournisseur de service à forcer (ex: 'groq').")
    max_retries: int = Field(default=3, description="Nombre maximum de tentatives pour les appels API.")
    delay: float = Field(default=0.5, description="Délai en secondes entre les tentatives.")
    temperature: float = Field(default=0.1, description="Température pour la génération de l'IA.")
    one_shot_max_tokens: int = Field(default=2000, description="Max tokens pour l'extraction en une étape.")
    validation_max_tokens: int = Field(default=100, description="Max tokens pour l'étape de validation seule.")
    extraction_max_tokens: int = Field(default=2000, description="Max tokens pour l'étape d'extraction seule.")
    # Nouvelle configuration spécifique à OpenRouter
    openrouter: OpenRouterConfig = Field(default_factory=lambda: OpenRouterConfig(), description="Paramètres OpenRouter.")

class ImageConfig(BaseModel):
    """Configuration pour le traitement d'image."""
    max_width: int = Field(default=2048, description="Largeur maximale de l'image.")
    max_height: int = Field(default=2048, description="Hauteur maximale de l'image.")
    max_file_size_mb: int = Field(default=4, description="Taille maximale du fichier en MB.")
    jpeg_quality: int = Field(default=85, description="Qualité de compression JPEG pour l'optimisation.")
    supported_formats: List[str] = Field(default_factory=lambda: ['.jpg', '.jpeg', '.png', '.webp'])

class AppConfig(BaseModel):
    """Modèle de configuration principal."""
    api: APIConfig = Field(default_factory=lambda: APIConfig())
    image: ImageConfig = Field(default_factory=lambda: ImageConfig())

# --- Chargement de la configuration ---

def load_config() -> AppConfig:
    """
    Charge la configuration depuis config.json, avec des valeurs par défaut.
    """
    config_path = Path(__file__).resolve().parent.parent.parent / "config.json"
    
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            config_data = json.load(f)
        return AppConfig(**config_data)
    
    # Si le fichier n'existe pas, on retourne la configuration par défaut
    return AppConfig()

# Instance globale de la configuration, chargée une seule fois
settings = load_config()

# Pour déboguer, on peut imprimer la configuration chargée
if __name__ == "__main__":
    print("Configuration chargée :")
    print(settings.model_dump_json(indent=2))