# Receipt Extract - OCR de Tickets de Caisse

Système d'extraction automatisée d'informations depuis des tickets de caisse (photos) avec classification et structuration en JSON, utilisant Llama 4 Scout via OpenRouter/Groq.

## 🚀 Fonctionnalités

- ✅ **Validation automatique** : Vérifie qu'il s'agit bien d'un ticket/reçu
- 📸 **OCR natif** : Extraction end-to-end avec vision model Llama 4 Scout
- 🏷️ **Classification automatique** : Catégorise les dépenses (Food, Transport, etc.)
- 💰 **Validation des totaux** : Recalcule et vérifie la cohérence
- 🌍 **Multi-langues** : Supporte tickets français, anglais, américains, etc.
- ⚡ **Inférence rapide** : Groq offre les temps de réponse les plus rapides
- 💸 **Très économique** : 2000 à 5000 tickets analysés pour 1$

## 🎯 Choix technologiques

### Pourquoi un LLM multimodal plutôt qu'un OCR classique ?

Après avoir testé différentes approches, le choix s'est porté sur un LLM multimodal pour plusieurs raisons :

**❌ OCR traditionnels (Tesseract, easyOCR, etc.)**
- Nécessitent de connaître la langue à l'avance → limite géographique
- Peu robustes face aux tickets froissés, mal éclairés, ou de mauvaise qualité
- Nécessitent un post-traitement complexe pour structurer les données
- Pas adaptés pour un utilisateur lambda avec des photos smartphone

**❌ OCR à réseaux de neurones (traitement local)**
- Trop gourmands en ressources (GPU requis)
- Latence importante sur CPU
- Complexité de déploiement pour un MVP

**✅ LLM multimodal (Llama 4 Scout via OpenRouter/Groq)**
- **Robuste** : Gère tickets froissés, éclairage variable, qualité d'image moyenne
- **Multilingue natif** : Détecte automatiquement la langue (FR, EN, ES, DE, etc.)
- **Rapide** : ~1.5s de latence (first token) grâce à Groq
- **Économique** : $0.0005/ticket max et environ (2000-5000 tickets pour 1$)
- **Simple** : Pas besoin de R&D avancée, solution pragmatique pour un MVP
- **End-to-end** : Extraction + structuration + validation en un seul appel

### Benchmark des solutions

**~50 LLMs testés** avec critères :
- Prix abordable (< $0.001/requête)
- Support vision robuste
- Multilingue
- Qualité d'extraction sur tickets réels

**Brokers de LLM évalués :**
- OpenRouter : Choisi pour son équilibre prix/performance et l'accès à Groq
- Groq : Provider ultra-rapide (latence 10x inférieure aux autres)

**Résultat :** Llama 4 Scout via OpenRouter/Groq offre le meilleur compromis robustesse/rapidité/coût pour un MVP

## 📋 Prérequis

- Python 3.10+
- Clé API OpenRouter ([obtenir une clé](https://openrouter.ai/keys)) ou Groq directement
- Image de ticket (formats : JPG, PNG)

## 🔧 Installation

```bash
# Clone ou télécharge le projet
cd receipt_extract

# Installe les dépendances
pip install -r requirements.txt

# Configure ta clé API
cp .env.example .env
# Édite .env et ajoute ta clé OPENROUTER_API_KEY
```

## 🎯 Utilisation

### Exemples de commandes

**Mode basique (one-shot) avec formatage :**
```bash
set PYTHONPATH=. && python src/main.py "Dataset/FR1.jpg" --pretty
```

**Test sur différents tickets :**
```bash
# Ticket français
python src/main.py "Dataset/FR1.jpg" --pretty

# Ticket américain
python src/main.py "Dataset/US1.jpg" --pretty

# Ticket anglais avec sauvegarde
python src/main.py "Dataset/UK1.jpg" --output result.json --pretty
```

**Mode two-step (validation + extraction) :**
```bash
python src/main.py "Dataset/FR3.jpg" --two-step --pretty
```

### 🚀 Traitement par lot (batch)

Pour analyser **plusieurs tickets en parallèle**, utilise `async_main.py` :

```bash
# Tous les tickets d'un dossier avec glob pattern
set PYTHONPATH=. && python src/async_main.py "Dataset/FR*.jpg" --pretty

# Plusieurs fichiers spécifiques
python src/async_main.py "Dataset/FR1.jpg" "Dataset/US1.jpg" "Dataset/UK1.jpg" --two-step

# Avec sauvegarde dans un dossier de sortie
python src/async_main.py "Dataset/*.jpg" --output results/ --pretty
```

**Avantages du mode batch :**
- ⚡ **Traitement parallèle** : Toutes les images sont analysées simultanément
- 🚀 **Gain de temps** : Les appels API ne se bloquent pas mutuellement
- 📁 **Sortie organisée** : Un fichier JSON distinct par image (`FR1_result.json`, `US1_result.json`, etc.)
- 🎯 **Support glob** : Utilise des wildcards pour sélectionner plusieurs fichiers (`*.jpg`, `FR?.jpg`, etc.)

**Options identiques à `main.py` :**
- `--two-step` : Mode validation + extraction
- `--no-optimize` : Désactive l'optimisation d'image
- `--pretty` : Affiche le JSON formaté
- `--debug` : Active les logs détaillés

### Options disponibles
```bash
python src/main.py --help

Options:
  --output, -o      Chemin du fichier JSON de sortie
  --two-step        Mode validation + extraction (2 appels API)
  --no-optimize     Désactive l'optimisation de l'image
  --pretty          Affiche le JSON formaté
  --debug           Active les logs de debug
```

## 📁 Structure du projet

```
receipt_extract/
├── src/
│   ├── api/
│   │   └── openrouter_client.py      # Client OpenRouter/Groq
│   ├── core/
│   │   ├── extraction_orchestrator.py # Orchestrateur principal
│   │   ├── json_formatter.py         # Validation Pydantic
│   │   ├── response_parser.py        # Extraction JSON des réponses
│   │   ├── error_handler.py          # Gestion centralisée des erreurs
│   │   └── interfaces.py             # Protocoles (DIP)
│   ├── utils/
│   │   ├── image_processor.py        # Traitement images
│   │   └── prompt_builder.py         # Construction prompts
│   ├── config/
│   │   ├── categories.py             # Catégories de dépenses
│   │   └── app_config.py             # Configuration centralisée
│   ├── main.py                       # Point d'entrée (1 image)
│   └── async_main.py                 # Point d'entrée batch (multiple images)
├── tests/
│   └── test_integration.py           # Tests d'intégration
├── Dataset/                          # Images de test
├── config.json                       # Configuration API et images
├── requirements.txt
├── .env.example
└── README.md
```

## 📊 Format de sortie JSON

```json
{
  "is_receipt": true,
  "category": "Food & Drinks",
  "merchant": {
    "name": "Restaurant Example",
    "address": "123 Rue de Paris",
    "phone": "+33 1 23 45 67 89",
    "vat_number": "FR12345678901"
  },
  "transaction": {
    "date": "2025-09-30",
    "time": "12:30:00",
    "receipt_number": "R-001234",
    "country": "France",
    "currency": "EUR"
  },
  "items": [
    {
      "description": "Menu du jour",
      "quantity": 1,
      "unit_price": 15.50,
      "total_price": 15.50,
      "tax_rate": 10.0
    }
  ],
  "totals": {
    "subtotal": 14.09,
    "tax": 1.41,
    "total": 15.50,
    "total_calculated": 15.50,
    "total_matches": true
  },
  "notes": null
}
```

## 🏷️ Catégories de dépenses

- **Food & Drinks** : Restaurants, bars, courses alimentaires
- **Events & Entertainment** : Concerts, cinéma, festivals
- **Travel & Transport** : Transports, essence, billets
- **Housing & Utilities** : Hébergements, loyers, charges
- **Shopping & Essentials** : Vêtements, pharmacie, équipement
- **On-Chain Life** : NFTs, crypto, abonnements digitaux

## 🔄 Modes d'extraction

### Mode One-shot (par défaut)
- **Un seul appel API** : validation + extraction combinées
- **Plus rapide et économique** : ~3500 tokens par analyse
- **Détection automatique** : Si l'image n'est pas un ticket, retourne `{"is_receipt": false, "reason": "..."}`
- **Recommandé** pour la plupart des cas d'usage

**Exemple :**
```bash
set PYTHONPATH=. && python src/main.py "Dataset/FR1.jpg" --pretty
```

### Mode Two-step
- **Deux appels API séparés** :
  1. Validation (100 tokens) : vérifie si c'est un ticket
  2. Extraction (2000 tokens) : extrait les données si validé
- **Plus coûteux** mais évite l'extraction complète si ce n'est pas un ticket
- **Utile** si tu traites beaucoup d'images variées (screenshots, photos, etc.)
- **Détection préalable** : Arrête le processus immédiatement si `is_receipt: false`

**Exemple :**
```bash
set PYTHONPATH=. && python src/main.py "Dataset/FR2.jpg" --two-step --pretty
```

### 🛡️ Détection des non-tickets

Le système détecte automatiquement si l'image n'est **pas un ticket de caisse** :
- Photos personnelles
- Documents
- Screenshots d'applications
- Images sans notion de dépense

En cas de non-ticket, la réponse sera :
```json
{
  "is_receipt": false,
  "reason": "Il s'agit d'une photo de paysage, pas d'un ticket de caisse"
}
```

## 💡 Utilisation en tant que module

```python
from src.core.receipt_extractor import ReceiptExtractor

# Initialise l'extracteur
extractor = ReceiptExtractor()

# Extrait les données
result = extractor.extract(
    image_path="Dataset/ticket-de-caisse.jpg",
    optimize_image=True,
    two_step=False
)

# Vérifie le résultat
if result["success"] and result["is_receipt"]:
    data = result["data"]
    print(f"Total: {data['totals']['total']} {data['transaction']['currency']}")
```

## ⚙️ Configuration

Les variables d'environnement dans `.env` :

```bash
# Obligatoire
OPENROUTER_API_KEY=your_key_here

# Optionnel - Change le modèle
OPENROUTER_MODEL=groq/llama-4-scout-17b-16e-instruct
```

Modèles disponibles :
- `groq/llama-4-scout-17b-16e-instruct` (recommandé, 16 experts)
- `groq/llama-4-maverick-17b-128e-instruct` (128 experts, plus puissant)

## 🐛 Dépannage

### Erreur "Clé API requise"
→ Vérifie que `OPENROUTER_API_KEY` est bien défini dans `.env`

### Image trop volumineuse
→ L'optimisation automatique réduit les images > 1MB. Utilise `--no-optimize` pour désactiver.

### JSON invalide retourné
→ Le modèle peut retourner du texte avec le JSON. Le système extrait automatiquement le JSON, mais vérifie `raw_response` en cas d'erreur.


## 🚧 Améliorations à venir

Ce projet est un prototype fonctionnel. Voici les points à finaliser pour une intégration production (WeSplit) :

### 1. **Formatage JSON personnalisé**
- Le schéma JSON actuel est générique
- À adapter selon les besoins spécifiques de WeSplit
- Possibilité d'ajouter/retirer des champs selon le cas d'usage

### 2. **Validation arithmétique stricte**
- Actuellement, le LLM calcule et vérifie les totaux (`total_matches`)
- **À faire** : Ajouter une validation côté Python (hors LLM) pour garantir que la somme des articles correspond au total du ticket
- Ajout de logs d'alerte en cas d'incohérence

### 3. **Optimisation et robustesse**
- Le code fonctionne mais peut être simplifié
- Ajout de garde-fous supplémentaires sur l'extraction
- Gestion d'erreurs avancée (tickets partiellement lisibles, formats exotiques)
- **Itération** en fonction des retours terrain et des besoins réels de WeSplit

> 💡 **Note** : Ces améliorations seront implémentées progressivement en fonction des cas d'usage concrets et des retours utilisateurs.

## 📝 Licence

Projet personnel - Usage libre

## 🤝 Contribution

Pour toute amélioration ou bug, ouvre une issue ou propose une pull request.
