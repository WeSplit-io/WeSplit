"""
Configuration des catégories de dépenses pour classification des tickets.
"""

EXPENSE_CATEGORIES = {
    "Food & Drinks": {
        "description": "Restaurants, bars, cafés, livraisons, courses alimentaires partagées",
        "examples": [
            "restaurant", "bar", "café", "supermarché", "boulangerie",
            "boucherie", "épicerie", "traiteur", "fast-food", "livraison"
        ]
    },
    "Events & Entertainment": {
        "description": "Festivals, concerts, cinéma, clubs, soirées, activités de groupe",
        "examples": [
            "cinéma", "concert", "festival", "théâtre", "musée",
            "parc d'attractions", "bowling", "escape game", "karting"
        ]
    },
    "Travel & Transport": {
        "description": "Transports en commun, taxis, covoiturages, essence, billets d'avion/train",
        "examples": [
            "taxi", "uber", "métro", "bus", "train", "avion",
            "station-service", "péage", "parking", "location voiture"
        ]
    },
    "Housing & Utilities": {
        "description": "Hébergements (Airbnb, hôtels), loyers partagés, charges, abonnements collectifs",
        "examples": [
            "hôtel", "airbnb", "loyer", "électricité", "eau", "gaz",
            "internet", "téléphone", "assurance habitation"
        ]
    },
    "Shopping & Essentials": {
        "description": "Achats non alimentaires : vêtements, équipement, cadeaux, pharmacie",
        "examples": [
            "vêtements", "chaussures", "pharmacie", "parfumerie",
            "librairie", "électronique", "décoration", "jardinage"
        ]
    },
    "On-Chain Life": {
        "description": "NFTs, mints, frais de gas, wallets partagés, abonnements digitaux, apps/jeux",
        "examples": [
            "nft", "crypto", "blockchain", "gas fees", "mint",
            "wallet", "abonnement streaming", "jeu vidéo", "app mobile"
        ]
    }
}


def get_categories_as_string() -> str:
    """
    Retourne une description formatée des catégories pour le prompt.

    Returns:
        String formaté avec toutes les catégories et descriptions.
    """
    categories_text = []
    for category, details in EXPENSE_CATEGORIES.items():
        categories_text.append(f"- **{category}**: {details['description']}")

    return "\n".join(categories_text)


def get_category_names() -> list[str]:
    """
    Retourne la liste des noms de catégories.

    Returns:
        Liste des noms de catégories.
    """
    return list(EXPENSE_CATEGORIES.keys())
