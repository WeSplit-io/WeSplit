"""
Client pour interagir avec OpenRouter API (Groq provider pour Llama Scout).
"""
import os
import base64
import time
import asyncio
import logging
import httpx
import re
import json
import random
from typing import Optional, Dict, Any

from openai import AsyncOpenAI, APIStatusError, APIError
from src.config.app_config import settings
from src.core.interfaces import APIClientInterface

# Configure le logger
logger = logging.getLogger(__name__)


class OpenRouterClient(APIClientInterface):
    """Client pour communiquer avec Llama Scout via OpenRouter/Groq."""

    def __init__(self, api_key: Optional[str] = None, http_client: Optional[httpx.AsyncClient] = None):
        """
        Initialise le client OpenRouter.
        """
        self.config = settings.api
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")

        if not self.api_key:
            logger.error("[OpenRouterClient] Clé API OpenRouter manquante")
            raise ValueError(
                "Clé API OpenRouter requise. "
                "Définis OPENROUTER_API_KEY dans l'environnement ou passe-la en paramètre."
            )
        else:
            logger.debug(f"[OpenRouterClient] Clé API trouvée (longueur: {len(self.api_key)})")

        # Utilise un client HTTP partagé pour bénéficier du pool de connexions
        self.http_client = http_client or httpx.AsyncClient()
        
        self.client = AsyncOpenAI(
            base_url=self.config.openrouter.base_url,
            api_key=self.api_key,
            http_client=self.http_client,  # Passe le client HTTP personnalisé à AsyncOpenAI
        )

        # Le modèle et le provider viennent de la config, avec fallback sur les variables d'env
        self.model = os.getenv("OPENROUTER_MODEL", self.config.model)
        self.provider = os.getenv("OPENROUTER_PROVIDER", self.config.provider)
    
    async def close(self):
        """Ferme la session du client HTTP."""
        await self.http_client.aclose()


    async def get_generation_stats(self, generation_id: str) -> Optional[Dict[str, Any]]:
        """
        Récupère les statistiques détaillées d'une génération depuis OpenRouter.
        """
        # Implémentation d'un exponential backoff avec jitter
        base_delay = self.config.delay  # Délai de base en secondes
        
        for attempt in range(self.config.max_retries):
            try:
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                }
                response = await self.http_client.get(
                    f"{self.config.openrouter.base_url}{self.config.openrouter.generation_path}?id={generation_id}",
                    headers=headers,
                    timeout=5.0
                )

                if response.status_code == 200:
                    json_data = response.json()
                    return json_data.get("data", {})
                elif response.status_code == 404 and attempt < self.config.max_retries - 1:
                    # Calcul du délai avec exponential backoff et jitter
                    delay = base_delay * (2 ** attempt)  # Exponential backoff
                    jitter = random.uniform(0, delay * 0.1)  # Jitter de 0 à 10% du délai
                    total_delay = delay + jitter
                    await asyncio.sleep(total_delay)
                    continue
                else:
                    return None
            except Exception:
                if attempt < self.config.max_retries - 1:
                    # Calcul du délai avec exponential backoff et jitter
                    delay = base_delay * (2 ** attempt)  # Exponential backoff
                    jitter = random.uniform(0, delay * 0.1)  # Jitter de 0 à 10% du délai
                    total_delay = delay + jitter
                    await asyncio.sleep(total_delay)
                    continue
                return None
        return None

    def encode_image_bytes(self, image_bytes: bytes) -> str:
        """
        Encode un objet bytes d'image en base64.
        """
        return base64.b64encode(image_bytes).decode("utf-8")

    async def analyze_receipt(
        self,
        image_bytes: bytes,
        mime_type: str,
        prompt: str,
        max_tokens: int,
    ) -> Dict[str, Any]:
        """
        Analyse un ticket de caisse avec Llama Scout.
        """
        logger.debug(f"[analyze_receipt] Début de l'analyse.")
        logger.debug(f"[analyze_receipt] Modèle utilisé: {self.model}")
        logger.debug(f"[analyze_receipt] Provider: {self.provider}")

        # Encode l'image en base64
        base64_image = self.encode_image_bytes(image_bytes)
        logger.debug(f"[analyze_receipt] Image encodée en base64, taille: {len(base64_image)} chars")
        logger.debug(f"[analyze_receipt] Type MIME fourni: {mime_type}")

        try:
            api_params = {
                "model": self.model,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{mime_type};base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                "temperature": self.config.temperature,
                "max_tokens": max_tokens,
                "response_format": {"type": self.config.openrouter.response_format_type},
            }

            if self.provider:
                api_params["extra_body"] = {
                    "provider": {
                        "order": [self.provider]
                    }
                }

            logger.debug("[analyze_receipt] Appel API OpenRouter en cours...")
            response = await self.client.chat.completions.create(**api_params)
            logger.debug(f"[analyze_receipt] Réponse reçue, ID: {response.id if hasattr(response, 'id') else 'None'}")

            generation_id = response.id if hasattr(response, 'id') else None
            content_to_return = None
            if response.choices and response.choices[0].message.content:
                original_content = response.choices[0].message.content
                logger.debug(f"[analyze_receipt] Contenu brut de la réponse (premiers 500 chars):\n{original_content[:500]}...")
                content_to_return = original_content

            usage_data = None
            if response.usage:
                usage_data = {
                    "prompt_tokens": int(response.usage.prompt_tokens),
                    "completion_tokens": int(response.usage.completion_tokens),
                    "total_tokens": int(response.usage.total_tokens),
                }

            metrics: Dict[str, Any] = {
                "first_token_latency_ms": None,
                "generation_time_ms": None,
                "throughput": None,
                "cost": None,
                "finish_reason": None
            }

            if response.choices:
                metrics["finish_reason"] = str(response.choices[0].finish_reason)

            if generation_id:
                stats = await self.get_generation_stats(generation_id)
                if stats:
                    latency = stats.get("latency")
                    if latency is not None:
                        metrics["first_token_latency_ms"] = int(latency)

                    gen_time = stats.get("generation_time")
                    if gen_time is not None:
                        metrics["generation_time_ms"] = int(gen_time)

                    cost = stats.get("usage")
                    if cost is not None:
                        metrics["cost"] = float(cost)

                    if metrics["generation_time_ms"] and usage_data:
                        completion_tokens = usage_data.get("completion_tokens", 0)
                        if completion_tokens > 0 and metrics["generation_time_ms"] > 0:
                            metrics["throughput"] = float(completion_tokens) / (float(metrics["generation_time_ms"]) / 1000.0)

            result = {
                "success": True,
                "content": content_to_return,
                "model": response.model,
                "usage": usage_data,
                "metrics": metrics
            }

            logger.debug(f"[analyze_receipt] ✓ Analyse terminée avec succès")
            logger.debug(f"[analyze_receipt] Métriques: {json.dumps(metrics, indent=2)}")

            return result

        except APIStatusError as e:
            logger.error(f"[analyze_receipt] ✗ Erreur HTTP {e.status_code} lors de l'analyse: {str(e)}")
            if hasattr(e, 'response') and e.response:
                logger.error(f"[analyze_receipt] Corps de la réponse d'erreur: {e.response.text}")
            logger.exception("Détails de l'exception APIStatusError:")
            return {
                "success": False,
                "error": f"HTTP {e.status_code}: {str(e)}",
                "content": None
            }
        except APIError as e:
            logger.error(f"[analyze_receipt] ✗ Erreur API OpenAI: {str(e)}")
            logger.exception("Détails de l'exception APIError:")
            return {
                "success": False,
                "error": str(e),
                "content": None
            }
        except Exception as e:
            logger.error(f"[analyze_receipt] ✗ Erreur inattendue lors de l'analyse: {str(e)}")
            logger.exception("Détails de l'exception générale:")
            return {
                "success": False,
                "error": str(e),
                "content": None
            }