"""
Construction de prompts structurés pour l'extraction de tickets.
"""
from typing import Optional
from src.config.categories import get_categories_as_string
from src.core.interfaces import PromptBuilderInterface


class PromptBuilder(PromptBuilderInterface):
    """Constructeur de prompts pour l'analyse de tickets avec Llama Scout."""

    def build_prompt(self, include_validation: bool = True) -> str:
        return self.build_extraction_prompt(include_validation)

    def build_extraction_prompt(self, include_validation: bool = True) -> str:
        """
        Build the complete extraction prompt in English for WeSplit integration.
        """
        categories = get_categories_as_string()

        prompt = f"""You are an expert in receipt and bill data extraction.
Your mission is to analyze the provided image and extract all information in raw JSON format.
Return ONLY the JSON, without Markdown tags, without formatting, and without any text before or after.

"""

        if include_validation:
            prompt += """**STEP 1 - VALIDATION**
First verify that the image contains a receipt or bill with expense information.
If it is NOT a receipt/bill, return only:
{{"is_receipt": false, "reason": "brief explanation"}}

"""

        prompt += f"""**DATA EXTRACTION**
If it is indeed a receipt/bill, extract the following information in raw JSON:

**Expected format:**
{{
  "is_receipt": true,
  "category": "expense category from the list below",
  "merchant": {{
    "name": "store/restaurant name",
    "address": "complete address",
    "phone": "phone number",
    "vat_number": "VAT number if present"
  }},
  "transaction": {{
    "date": "YYYY-MM-DD",
    "time": "HH:MM:SS",
    "receipt_number": "receipt number",
    "country": "country",
    "currency": "currency code (EUR, USD, GBP, etc.)"
  }},
  "items": [
    {{
      "description": "item name",
      "quantity": 1,
      "unit_price": 0.00,
      "total_price": 0.00,
      "tax_rate": 0.00
    }}
  ],
  "totals": {{
    "subtotal": 0.00,
    "tax": 0.00,
    "total": 0.00,
    "total_calculated": 0.00,
    "total_matches": true
  }},
  "notes": "any observations"
}}

**EXPENSE CATEGORIES**
Choose ONE category from:
{categories}

**IMPORTANT RULES**
1. Extract ALL visible information from the receipt
2. If total is present, calculate sum of items and compare (field "total_matches")
3. If total is missing, calculate it and put it in "total_calculated"
4. Automatically detect country and currency
5. For missing fields, use null
6. Return ONLY the JSON, without text before or after
7. Handle negative amounts properly (discounts, refunds) - use absolute values

**QUALITY ATTENTION**
- If some amounts are unreadable, indicate it in "notes"
- Verify that the sum of items matches the total
- Negative amounts (discounts/refunds) should be converted to positive values"""

        return prompt

    def build_validation_only_prompt(self) -> str:
        """
        Build a prompt only for validating if it's a receipt.
        """
        return """Analyze this image and respond only with raw JSON:

If it's a receipt or bill with an expense:
{"is_receipt": true}

Otherwise:
{"is_receipt": false, "reason": "brief explanation"}

Return ONLY the JSON, without Markdown tags, without formatting, and without any text before or after."""