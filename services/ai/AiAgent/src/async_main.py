"""
Point d'entrée principal pour l'extraction de tickets de caisse en mode asynchrone.

Exemple d'utilisation :
    python src/async_main.py "Dataset/FR*.jpg"
    python src/async_main.py "Dataset/FR1.jpg" "Dataset/UK1.jpg" --two-step
"""
import argparse
import json
import sys
import logging
import asyncio
import glob
from pathlib import Path
from dotenv import load_dotenv

# Ajoute le répertoire racine au PYTHONPATH pour les imports absolus
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Charge les variables d'environnement depuis .env
load_dotenv()

from src.core.extraction_orchestrator import ExtractionOrchestrator
from src.api.openrouter_client import OpenRouterClient
from src.utils.image_processor import ImageProcessor
from src.utils.prompt_builder import PromptBuilder
from src.core.response_parser import ResponseParser
from src.core.error_handler import ErrorHandler


async def process_one_image(image_path: str, extractor: ExtractionOrchestrator, args: argparse.Namespace):
    """Traite une seule image et affiche le résultat."""
    print(f"\n[ANALYSE] Début du traitement pour : {image_path}")
    print("-" * 40)
    
    # Extraction
    result = await extractor.extract(
        image_path=image_path,
        optimize_image=not args.no_optimize,
        two_step=args.two_step
    )

    # Gestion des erreurs
    if not result["success"]:
        print(f"[ERREUR] {result['error']}", file=sys.stderr)
        if "raw_response" in result:
            print("[REPONSE BRUTE]", file=sys.stderr)
            print(result["raw_response"], file=sys.stderr)
        return

    # Affichage du résultat
    print(f"[SUCCES] Extraction réussie pour : {image_path}")
    
    # Vérifie si c'est un ticket
    if not result.get("is_receipt", True):
        print("[AVERTISSEMENT] Ce n'est pas un ticket de caisse")
        print(f"  Raison : {result['data'].get('reason', 'Non specifiee')}")
        return # Pas besoin d'aller plus loin si ce n'est pas un ticket

    # Affiche les statistiques d'usage et métriques de performance
    if "usage" in result and result["usage"]:
        usage = result["usage"]
        print(f"\n  [USAGE TOKENS]")
        if "validation" in usage: # Mode Two-step
            print(f"    - Validation : {usage['validation'].get('total_tokens', 0)} tokens")
            print(f"    - Extraction : {usage['extraction'].get('total_tokens', 0)} tokens")
        print(f"    - Total      : {usage.get('total_tokens', 'N/A')} tokens")

    # Affiche les métriques de performance
    if "metrics" in result and result["metrics"]:
        metrics_data = result["metrics"].get("extraction", result["metrics"]) # Gère le mode two-step
        print(f"\n  [METRIQUES PERFORMANCE]")
        if metrics_data.get("first_token_latency_ms") is not None:
            latency_sec = metrics_data['first_token_latency_ms'] / 1000.0
            print(f"    - First token latency : {latency_sec:.3f} s")
        if metrics_data.get("generation_time_ms") is not None:
            gen_time_sec = metrics_data['generation_time_ms'] / 1000.0
            print(f"    - Generation time     : {gen_time_sec:.3f} s")
        if metrics_data.get("throughput") is not None:
            print(f"    - Throughput          : {metrics_data['throughput']:.1f} tokens/s")
        if metrics_data.get("cost") is not None:
            print(f"    - Cost                : ${metrics_data['cost']:.6f}")
            
    data = result["data"]
    json_indent = 2 if args.pretty else None
    json_output = json.dumps(data, indent=json_indent, ensure_ascii=False)

    print("\n  [DONNEES EXTRAITES]")
    print("  " + "=" * 60)
    # Ajoute une indentation pour la lisibilité
    for line in json_output.splitlines():
        print(f"  {line}")
    print("  " + "=" * 60)

    # Sauvegarde si demandé (nom de fichier basé sur l'original)
    if args.output:
        output_dir = Path(args.output)
        output_dir.mkdir(exist_ok=True)
        # Nom de fichier unique pour chaque image
        output_path = output_dir / f"{Path(image_path).stem}_result.json"
        
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"[SAUVEGARDE] Résultat sauvegardé dans : {output_path}")

async def main():
    """Fonction principale."""
    parser = argparse.ArgumentParser(
        description="Extrait les données de tickets de caisse en parallèle via OCR avec Llama Scout"
    )

    parser.add_argument(
        "image_paths",
        type=str,
        nargs='+',
        help="Chemins ou motifs (glob) vers les images des tickets. Ex: 'images/*.jpg'"
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
    log_level = logging.DEBUG if args.debug else logging.WARNING
    logging.basicConfig(level=log_level, format='[%(levelname)s] %(name)s: %(message)s')

    # Étend les motifs glob pour obtenir la liste complète des fichiers
    all_files = []
    for path in args.image_paths:
        expanded = glob.glob(path)
        if not expanded:
            print(f"[AVERTISSEMENT] Aucun fichier trouvé pour le motif : {path}", file=sys.stderr)
        all_files.extend(expanded)

    if not all_files:
        print("[ERREUR] Aucun fichier image à traiter.", file=sys.stderr)
        sys.exit(1)
        
    print(f"Found {len(all_files)} images to process.")


    # Crée l'extracteur
    # Crée les dépendances
    try:
        api_client = OpenRouterClient()
        image_processor = ImageProcessor()
        prompt_builder = PromptBuilder()
        response_parser = ResponseParser()
        error_handler = ErrorHandler()
        
        # Crée l'orchestrateur avec injection de dépendances
        extractor = ExtractionOrchestrator(
            api_client=api_client,
            image_processor=image_processor,
            prompt_builder=prompt_builder,
            response_parser=response_parser,
            error_handler=error_handler
        )
    except ValueError as e:
        print(f"[ERREUR] Initialisation : {e}", file=sys.stderr)
        print("[INFO] Assure-toi d'avoir défini OPENROUTER_API_KEY dans ton environnement", file=sys.stderr)
        sys.exit(1)

    # Crée les tâches pour chaque image
    tasks = [process_one_image(str(path), extractor, args) for path in all_files]
    
    # Exécute les tâches en parallèle
    await asyncio.gather(*tasks)

    # Nettoie la session client
    await extractor.close_client_session()
    print("\n[FIN] Tous les traitements sont terminés.")


if __name__ == "__main__":
    asyncio.run(main())