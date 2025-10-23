"""
Traitement et préparation des images pour l'API.
"""
import asyncio
from pathlib import Path
from typing import ClassVar, FrozenSet, Optional, Tuple
from PIL import Image
import io

from src.config.app_config import settings
from src.core.interfaces import ImageProcessorInterface


class ImageProcessor(ImageProcessorInterface):
    """Processeur pour préparer les images avant envoi à l'API."""

    _SUPPORTED_PIL_FORMATS: ClassVar[FrozenSet[str]] = frozenset({"jpg", "jpeg", "png", "bmp"})

    def __init__(self) -> None:
        self.config = settings.image
        self.max_file_size_bytes = self.config.max_file_size_mb * 1024 * 1024

        raw_supported_formats = getattr(self.config, "supported_formats", ())
        normalized_extensions = {
            ext
            for fmt in raw_supported_formats
            for ext in (self._normalize_extension(fmt),)
            if ext is not None
        }
        if not normalized_extensions:
            normalized_extensions = {".jpg", ".jpeg", ".png", ".bmp"}

        self._supported_extensions: set[str] = set(normalized_extensions)
        self._supported_formats_display: Tuple[str, ...] = (
            tuple(raw_supported_formats)
            if raw_supported_formats
            else tuple(sorted(self._supported_extensions))
        )

    @staticmethod
    def _normalize_extension(fmt: Optional[str]) -> Optional[str]:
        """
        Normalise une extension pour les comparaisons (préfixe '.' et minuscule).
        """
        if fmt is None:
            return None
        normalized = fmt.strip().lower()
        if not normalized:
            return None
        return normalized if normalized.startswith(".") else f".{normalized}"

    @staticmethod
    def _safe_lower(value: Optional[str]) -> Optional[str]:
        """
        Version sûre de str.lower() qui gère les valeurs None.
        """
        return value.lower() if isinstance(value, str) else None

    def validate_image(self, image_path: str) -> Tuple[bool, str]:
        """
        Valide qu'une image est compatible.
        """
        path = Path(image_path)

        if not path.exists():
            return False, f"Fichier introuvable : {image_path}"

        suffix = self._normalize_extension(path.suffix)
        allowed_formats = ", ".join(self._supported_formats_display)
        if not suffix or suffix not in self._supported_extensions:
            human_suffix = path.suffix or "(sans extension)"
            return False, f"Format non supporté : {human_suffix}. Formats acceptés : {allowed_formats}"

        file_size = path.stat().st_size
        if file_size > self.max_file_size_bytes:
            return False, f"Fichier trop volumineux : {file_size / (1024*1024):.2f}MB (max: {self.config.max_file_size_mb}MB)"

        try:
            with Image.open(image_path) as img:
                # Vérification plus souple, car Pillow peut lire des formats même si l'extension est différente
                image_format = self._safe_lower(img.format)
                if image_format not in self._SUPPORTED_PIL_FORMATS:
                    human_format = img.format or "inconnu"
                    return False, f"Format d'image non géré : {human_format}"
        except Exception as e:
            return False, f"Impossible d'ouvrir l'image : {str(e)}"

        return True, "Image valide"

    def _process_image_sync(self, image_path: str, optimize: bool) -> Tuple[bytes, str]:
        """
        Prépare une image en mémoire (validation, redimensionnement, optimisation)
        et la retourne en tant qu'objet bytes et son type MIME.

        Returns:
            Tuple[bytes, str]: L'image préparée sous forme de bytes et le type MIME.
        """
        is_valid, message = self.validate_image(image_path)
        if not is_valid:
            raise ValueError(message)

        with Image.open(image_path) as img:
            # Redimensionnement si nécessaire
            width, height = img.size
            if width > self.config.max_width or height > self.config.max_height:
                ratio = min(self.config.max_width / width, self.config.max_height / height)
                new_width = int(width * ratio)
                new_height = int(height * ratio)
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

            output_format = 'JPEG'
            mime_type = 'image/jpeg'

            # Conversion en RGB et optimisation
            if img.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.getchannel('A') if 'A' in img.getbands() else None)
                img = background

            # Sauvegarde dans un buffer mémoire
            buffer = io.BytesIO()
            if optimize:
                img.save(buffer, output_format, quality=self.config.jpeg_quality, optimize=True)
            else:
                original_format = img.format or 'PNG'
                output_format = 'PNG' if original_format.upper() == 'PNG' else 'JPEG'
                mime_type = f'image/{output_format.lower()}'
                img.save(buffer, format=output_format)
            
            return buffer.getvalue(), mime_type

    async def process_image_in_memory(self, image_path: str, optimize: bool = True) -> Tuple[bytes, str]:
        """
        Prépare une image en mémoire (validation, redimensionnement, optimisation)
        et la retourne en tant qu'objet bytes et son type MIME.

        Returns:
            Tuple[bytes, str]: L'image préparée sous forme de bytes et le type MIME.
        """
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._process_image_sync, image_path, optimize)