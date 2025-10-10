"""
Orchestrateur principal pour l'extraction de tickets de caisse.
"""
import json
from typing import Dict, Any, Optional
from pathlib import Path

from src.core.interfaces import (
    APIClientInterface,
    ImageProcessorInterface,
    PromptBuilderInterface,
    ResponseParserInterface,
    ErrorHandlerInterface
)
from src.core.json_formatter import parse_receipt_json, ReceiptData, InvalidReceipt
from src.config.app_config import settings


class ExtractionOrchestrator:
    """Orchestrateur de l'extraction de données de tickets de caisse."""

    def __init__(
        self,
        api_client: APIClientInterface,
        image_processor: ImageProcessorInterface,
        prompt_builder: PromptBuilderInterface,
        response_parser: ResponseParserInterface,
        error_handler: ErrorHandlerInterface
    ):
        """
        Initialise l'orchestrateur avec les dépendances injectées.
        """
        self.client = api_client
        self.image_processor = image_processor
        self.prompt_builder = prompt_builder
        self.response_parser = response_parser
        self.error_handler = error_handler
        self.config = settings.api

    async def close_client_session(self):
        """Ferme la session du client API."""
        await self.client.close()

    async def extract(
        self,
        image_path: str,
        optimize_image: bool = True,
        two_step: bool = False
    ) -> Dict[str, Any]:
        """
        Extrait les données d'un ticket de caisse.
        """
        # 1. Prépare l'image en mémoire
        try:
            # Note: Le traitement de l'image reste synchrone car il est CPU-bound.
            # Pour de très gros volumes, on pourrait utiliser run_in_executor.
            image_bytes, mime_type = await self.image_processor.process_image_in_memory(
                image_path,
                optimize=optimize_image
            )
        except Exception as e:
            return self.error_handler.handle_image_processing_error(e)

        # 2. Choix du mode : one-shot ou two-step
        image_data = (image_bytes, mime_type)
        if two_step:
            return await self._extract_two_step(image_data)
        else:
            return await self._extract_one_shot(image_data)

    async def _extract_one_shot(self, image_data: tuple[bytes, str]) -> Dict[str, Any]:
        """
        Extraction en un seul appel.
        """
        image_bytes, mime_type = image_data
        prompt = self.prompt_builder.build_extraction_prompt(include_validation=True)

        try:
            response = await self.client.analyze_receipt(
                image_bytes=image_bytes,
                mime_type=mime_type,
                prompt=prompt,
                max_tokens=self.config.one_shot_max_tokens
            )
        except Exception as e:
            return self.error_handler.handle_api_error(e)

        if not response["success"]:
            return self.error_handler.handle_api_error(Exception(response['error']))

        try:
            json_content = self.response_parser.extract_json_from_response(response["content"])
            receipt_data = parse_receipt_json(json_content)

            return {
                "success": True,
                "data": receipt_data.model_dump(),
                "is_receipt": isinstance(receipt_data, ReceiptData),
                "usage": response.get("usage", {}),
                "metrics": response.get("metrics", {}),
                "raw_response": response["content"]
            }
        except Exception as e:
            return self.error_handler.handle_parsing_error(e, response["content"])

    async def _extract_two_step(self, image_data: tuple[bytes, str]) -> Dict[str, Any]:
        """
        Extraction en deux étapes : validation puis extraction.
        """
        image_bytes, mime_type = image_data
        
        # ÉTAPE 1 : Validation
        validation_prompt = self.prompt_builder.build_validation_only_prompt()

        try:
            validation_response = await self.client.analyze_receipt(
                image_bytes=image_bytes,
                mime_type=mime_type,
                prompt=validation_prompt,
                max_tokens=self.config.validation_max_tokens
            )
        except Exception as e:
            return self.error_handler.handle_api_validation_error(e)

        if not validation_response["success"]:
            return self.error_handler.handle_api_validation_error(Exception(validation_response['error']))

        try:
            validation_json = self.response_parser.extract_json_from_response(validation_response["content"])
            validation_data = json.loads(validation_json)

            if not validation_data.get("is_receipt", False):
                return {
                    "success": True,
                    "is_receipt": False,
                    "data": validation_data,
                    "usage": validation_response.get("usage", {}),
                    "metrics": validation_response.get("metrics", {})
                }
        except Exception as e:
            return self.error_handler.handle_validation_error(e)

        # ÉTAPE 2 : Extraction complète
        extraction_prompt = self.prompt_builder.build_extraction_prompt(include_validation=False)

        try:
            extraction_response = await self.client.analyze_receipt(
                image_bytes=image_bytes,
                mime_type=mime_type,
                prompt=extraction_prompt,
                max_tokens=self.config.extraction_max_tokens
            )
        except Exception as e:
            return self.error_handler.handle_api_extraction_error(e)

        if not extraction_response["success"]:
            return self.error_handler.handle_api_extraction_error(Exception(extraction_response['error']))

        try:
            json_content = self.response_parser.extract_json_from_response(extraction_response["content"])
            receipt_data = parse_receipt_json(json_content)

            total_usage = {
                "validation": validation_response.get("usage", {}),
                "extraction": extraction_response.get("usage", {}),
                "total_tokens": (
                    validation_response.get("usage", {}).get("total_tokens", 0) +
                    extraction_response.get("usage", {}).get("total_tokens", 0)
                )
            }
            combined_metrics = {
                "validation": validation_response.get("metrics", {}),
                "extraction": extraction_response.get("metrics", {})
            }

            return {
                "success": True,
                "data": receipt_data.model_dump(),
                "is_receipt": True,
                "usage": total_usage,
                "metrics": combined_metrics,
                "raw_response": extraction_response["content"]
            }
        except Exception as e:
            return self.error_handler.handle_parsing_error(e, extraction_response["content"])