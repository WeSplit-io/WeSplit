"""
Parseur de réponse pour extraire le JSON des réponses de l'API.
"""
import json
import re
from typing import Any

from src.core.interfaces import ResponseParserInterface


class ResponseParser(ResponseParserInterface):
    """Parseur de réponse pour extraire le JSON des réponses de l'API."""

    def extract_json_from_response(self, response_text: str) -> str:
        """
        Extrait une chaîne JSON valide d'un texte potentiellement mal formaté.
        """
        # Essaye d'abord d'extraire un bloc JSON avec des balises
        match = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
        if match:
            potential_json = match.group(1)
            try:
                json.loads(potential_json)
                return potential_json
            except json.JSONDecodeError:
                pass

        # Si aucune balise JSON n'a été trouvée, utilise une machine à états
        # pour trouver le début et la fin de l'objet/tableau JSON principal
        start_pos = -1
        end_pos = -1
        depth = 0
        in_string = False
        escape_next = False
        open_char = None
        close_char = None
        
        for i, char in enumerate(response_text):
            # Gestion des caractères d'échappement dans les chaînes
            if escape_next:
                escape_next = False
                continue
                
            if char == '\\':
                escape_next = True
                continue
                
            # Gestion des chaînes de caractères
            if char == '"' and not escape_next:
                in_string = not in_string
                
            # Si on est dans une chaîne, ignore les caractères spéciaux
            if in_string:
                continue
                
            # Recherche du premier caractère d'ouverture
            if start_pos == -1:
                if char == '{':
                    start_pos = i
                    open_char = '{'
                    close_char = '}'
                    depth = 1
                elif char == '[':
                    start_pos = i
                    open_char = '['
                    close_char = ']'
                    depth = 1
            # Suivi de la profondeur pour trouver la fin
            elif char == open_char:
                depth += 1
            elif char == close_char:
                depth -= 1
                if depth == 0:
                    end_pos = i + 1
                    break
        
        if start_pos != -1 and end_pos != -1:
            potential_json = response_text[start_pos:end_pos]
            try:
                json.loads(potential_json)
                return potential_json
            except json.JSONDecodeError:
                pass
        
        raise ValueError("Impossible d'extraire un objet ou un tableau JSON complet et valide.")