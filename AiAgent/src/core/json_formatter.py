"""
Validation and formatting of extracted data with Pydantic for WeSplit integration.
"""
from typing import Optional, List
from datetime import date, time
from pydantic import BaseModel, Field, field_validator
from src.core.interfaces import JSONFormatterInterface


class MerchantInfo(BaseModel):
    """Merchant information."""
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    vat_number: Optional[str] = None


class TransactionInfo(BaseModel):
    """Transaction information."""
    date: Optional[str] = None
    time: Optional[str] = None
    receipt_number: Optional[str] = None
    country: Optional[str] = None
    currency: Optional[str] = None


class ReceiptItem(BaseModel):
    """A receipt item."""
    description: str
    quantity: float = 1.0
    unit_price: Optional[float] = None
    total_price: Optional[float] = None
    tax_rate: Optional[float] = None

    @field_validator('quantity', 'unit_price', 'total_price')
    @classmethod
    def must_be_positive(cls, v: Optional[float]) -> Optional[float]:
        """Verify that amounts are positive, convert negative to positive if needed."""
        if v is not None and v < 0:
            # Convert negative amounts to positive (common in receipts for discounts/refunds)
            return abs(v)
        return v


class Totals(BaseModel):
    """Receipt totals."""
    subtotal: Optional[float] = None
    tax: Optional[float] = None
    total: Optional[float] = None
    total_calculated: Optional[float] = None
    total_matches: Optional[bool] = None

    def calculate_from_items(self, items: List[ReceiptItem], tolerance: float = 0.01) -> None:
        """
        Calculate totals from items and verify consistency.
        """
        self.total_calculated = sum(item.total_price for item in items if item.total_price is not None)

        if self.total is not None:
            self.total_matches = abs(self.total - self.total_calculated) <= tolerance if self.total_calculated is not None else False
        else:
            self.total = self.total_calculated
            self.total_matches = True


class ReceiptData(BaseModel):
    """Complete receipt data structure for WeSplit."""
    is_receipt: bool = True
    category: Optional[str] = None
    merchant: Optional[MerchantInfo] = None
    transaction: Optional[TransactionInfo] = None
    items: List[ReceiptItem] = Field(default_factory=list)
    totals: Optional[Totals] = None
    notes: Optional[str] = None
    reason: Optional[str] = None  # If is_receipt = False

    @field_validator('category')
    @classmethod
    def validate_category(cls, v: Optional[str]) -> Optional[str]:
        """Verify that the category is valid."""
        if v is None:
            return v

        valid_categories = [
            "Food & Drinks",
            "Events & Entertainment",
            "Travel & Transport",
            "Housing & Utilities",
            "Shopping & Essentials",
            "On-Chain Life"
        ]

        if v not in valid_categories:
            raise ValueError(
                f"Invalid category: {v}. "
                f"Valid categories: {', '.join(valid_categories)}"
            )
        return v

    def validate_totals(self, tolerance: float = 0.01) -> None:
        """
        Validate and recalculate totals if necessary.
        """
        if self.totals and self.items:
            self.totals.calculate_from_items(self.items, tolerance)


class InvalidReceipt(BaseModel):
    """Response when the image is not a receipt."""
    is_receipt: bool = False
    reason: str


class JSONFormatter(JSONFormatterInterface):
    """JSON formatter for validating and formatting extracted data."""

    def format_json(self, json_str: str) -> ReceiptData | InvalidReceipt:
        return parse_receipt_json(json_str)


def parse_receipt_json(json_str: str) -> ReceiptData | InvalidReceipt:
    """
    Parse and validate JSON returned by the API.
    """
    import json

    try:
        data = json.loads(json_str)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON: {e}")

    if data.get("is_receipt") is not True:
        return InvalidReceipt(**data)

    receipt = ReceiptData(**data)
    receipt.validate_totals()

    return receipt