"""
Point d'entrée principal pour l'extraction de tickets de caisse.

Exemple d'utilisation :
    python src/main.py Dataset/ticket-de-caisse.jpg
    python src/main.py Dataset/ticket-de-caisse.jpg --two-step
    python src/main.py Dataset/ticket-de-caisse.jpg --output result.json
"""
import argparse
import json
import sys
import logging
import asyncio
from pathlib import Path
from dotenv import load_dotenv

# Ajoute le répertoire racine au PYTHONPATH pour les imports absolus
# Cela permet d'exécuter `python src/main.py` directement
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Charge les variables d'environnement depuis .env (supporte le fichier déplacé)
ENV_PATH_CANDIDATES = [
    PROJECT_ROOT / ".env",
    PROJECT_ROOT.parent / ".env",
]

env_loaded = False
for candidate in ENV_PATH_CANDIDATES:
    if candidate.is_file():
        env_loaded = load_dotenv(dotenv_path=candidate, override=False)
        if env_loaded:
            break

if not env_loaded:
    load_dotenv(override=False)

import asyncio
from src.core.extraction_orchestrator import ExtractionOrchestrator
from src.api.openrouter_client import OpenRouterClient
from src.utils.image_processor import ImageProcessor
from src.utils.prompt_builder import PromptBuilder
from src.core.response_parser import ResponseParser
from src.core.error_handler import ErrorHandler


async def async_main(image_path: str, args):
    """Coroutine principale pour l'extraction asynchrone."""
    # Instanciation de toutes les dépendances
    api_client = OpenRouterClient()
    image_processor = ImageProcessor()
    prompt_builder = PromptBuilder()
    response_parser = ResponseParser()
    error_handler = ErrorHandler()

    # Création de l'orchestrateur avec injection de dépendances
    orchestrator = ExtractionOrchestrator(
        api_client=api_client,
        image_processor=image_processor,
        prompt_builder=prompt_builder,
        response_parser=response_parser,
        error_handler=error_handler
    )

    # Extraction
    print(f"[ANALYSE] Image : {image_path}")
    print(f"[MODE] {'Two-step (validation + extraction)' if args.two_step else 'One-shot'}")

    try:
        result = await orchestrator.extract(
            image_path=image_path,
            optimize_image=not args.no_optimize,
            two_step=args.two_step
        )

        # Gestion des erreurs
        if not result["success"]:
            print(f"\n[ERREUR] {result['error']}", file=sys.stderr)
            if "raw_response" in result:
                print("\n[REPONSE BRUTE]", file=sys.stderr)
                print(result["raw_response"], file=sys.stderr)
            return result

        # Affichage du résultat
        print("\n[SUCCES] Extraction reussie!\n")

        # Vérifie si c'est un ticket
        if not result.get("is_receipt", True):
            print("[AVERTISSEMENT] Ce n'est pas un ticket de caisse")
            print(f"Raison : {result['data'].get('reason', 'Non specifiee')}")
            return result

        # Affiche les statistiques d'usage et métriques de performance
        if "usage" in result and result["usage"]:
            usage = result["usage"]
            print(f"\n[USAGE TOKENS]")
            print(f"   - Prompt : {usage.get('prompt_tokens', 'N/A')} tokens")
            print(f"   - Completion : {usage.get('completion_tokens', 'N/A')} tokens")
            print(f"   - Total : {usage.get('total_tokens', 'N/A')} tokens")

            if "validation" in usage:
                print(f"   - Validation : {usage['validation'].get('total_tokens', 0)} tokens")
                print(f"   - Extraction : {usage['extraction'].get('total_tokens', 0)} tokens")

        # Affiche les métriques de performance
        if "metrics" in result and result["metrics"]:
            metrics = result["metrics"].get("extraction", result["metrics"])
            print(f"\n[METRIQUES PERFORMANCE]")

            if metrics.get("first_token_latency_ms") is not None:
                latency_sec = metrics['first_token_latency_ms'] / 1000.0
                print(f"   - First token latency : {latency_sec:.3f} secondes ({metrics['first_token_latency_ms']} ms)")
            else:
                print(f"   - First token latency : None")

            if metrics.get("generation_time_ms") is not None:
                gen_time_sec = metrics['generation_time_ms'] / 1000.0
                print(f"   - Generation time : {gen_time_sec:.3f} secondes ({metrics['generation_time_ms']} ms)")
            else:
                print(f"   - Generation time : None")

            if metrics.get("throughput") is not None:
                print(f"   - Throughput : {metrics['throughput']:.1f} tokens/seconde")
            else:
                print(f"   - Throughput : None")

            if metrics.get("cost") is not None:
                print(f"   - Cost : ${metrics['cost']:.6f}")
            else:
                print(f"   - Cost : None")

            if metrics.get("finish_reason") is not None:
                print(f"   - Finish reason : {metrics['finish_reason']}")
            else:
                print(f"   - Finish reason : None")

        # Affiche le JSON
        json_indent = 2 if args.pretty else None
        json_output = json.dumps(result["data"], indent=json_indent, ensure_ascii=False)

        print("\n[DONNEES EXTRAITES]")
        print("=" * 80)
        print(json_output)
        print("=" * 80)

        # Affiche quelques infos clés
        data = result["data"]
        if "merchant" in data and data["merchant"]:
            print(f"\n[COMMERCANT] {data['merchant'].get('name', 'N/A')}")
        if "category" in data:
            print(f"[CATEGORIE] {data.get('category', 'N/A')}")
        if "totals" in data and data["totals"]:
            total = data["totals"].get("total", "N/A")
            currency = data.get("transaction", {}).get("currency", "")
            print(f"[TOTAL] {total} {currency}")
            if data["totals"].get("total_matches") is False:
                print("[ATTENTION] Le total ne correspond pas a la somme des articles")

        # Sauvegarde si demandé
        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                json.dump(result["data"], f, indent=2, ensure_ascii=False)
            print(f"\n[SAUVEGARDE] Resultat sauvegarde dans : {args.output}")

        return result
    finally:
        # Assurer la fermeture propre
        await orchestrator.close_client_session()


def main():
    """Fonction principale."""
    parser = argparse.ArgumentParser(
        description="Extrait les données d'un ticket de caisse via OCR avec Llama Scout"
    )

    parser.add_argument(
        "image_path",
        type=str,
        help="Chemin vers l'image du ticket"
    )

    parser.add_argument(
        "--output", "-o",
        type=str,
        default=None,
        help="Chemin du fichier JSON de sortie (optionnel)"
    )

    parser.add_argument(
        "--two-step",
        action="store_true",
        help="Active le mode validation + extraction en 2 étapes (plus coûteux mais plus sûr)"
    )

    parser.add_argument(
        "--no-optimize",
        action="store_true",
        help="Désactive l'optimisation de l'image avant envoi"
    )

    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Affiche le JSON formaté (avec indentations)"
    )

    parser.add_argument(
        "--debug",
        action="store_true",
        help="Active les logs de debug"
    )

    args = parser.parse_args()

    # Configure le niveau de log
    if args.debug:
        logging.basicConfig(
            level=logging.DEBUG,
            format='[%(levelname)s] %(name)s: %(message)s'
        )
    else:
        logging.basicConfig(
            level=logging.WARNING,
            format='[%(levelname)s] %(message)s'
        )

    # Vérifie que l'image existe
    if not Path(args.image_path).exists():
        print(f"[ERREUR] Fichier introuvable : {args.image_path}", file=sys.stderr)
        sys.exit(1)

    # Exécute la coroutine principale
    result = asyncio.run(async_main(args.image_path, args))
    
    # Si le résultat contient une erreur, on quitte avec un code d'erreur
    if result and not result.get("success", True):
        sys.exit(1)


if __name__ == "__main__":
    main()