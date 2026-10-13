import io
import os
import re
from typing import Tuple
from fastapi import HTTPException, status
try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

try:
    import pypdf
except ImportError:
    pypdf = None

import docx  # python-docx
from app.core.config import settings

SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".docx"}


class ExtractionResult:
    def __init__(self, text: str, word_count: int, char_count: int, truncated: bool = False):
        self.text = text
        self.word_count = word_count
        self.char_count = char_count
        self.truncated = truncated


def validate_file(filename: str, file_size: int) -> str:
    """
    Validates file extension and size constraints.
    Returns the normalized extension.
    """
    if not filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename cannot be empty."
        )

    _, ext = os.path.splitext(filename.lower())
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: {', '.join(sorted(SUPPORTED_EXTENSIONS))}."
        )

    if file_size > settings.max_file_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB} MB."
        )

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty (0 bytes)."
        )

    return ext


def clean_extracted_text(text: str) -> str:
    """
    Normalizes whitespace and removes unprintable control characters.
    """
    if not text:
        return ""
    # Remove control characters except standard whitespace
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", "", text)
    # Normalize multiple blank lines to double newlines
    text = re.sub(r"\n\s*\n\s*\n+", "\n\n", text)
    # Normalize horizontal whitespace
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def extract_text_from_pdf(content: bytes) -> str:
    """
    Extracts text from PDF bytes using PyMuPDF (fitz) or pypdf fallback.
    Detects if the PDF has no selectable text (scanned / image-only).
    """
    extracted_pages = []

    if fitz is not None:
        try:
            doc = fitz.open(stream=content, filetype="pdf")
            if doc.page_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="The PDF contains 0 pages."
                )
            for page_num in range(doc.page_count):
                page = doc.load_page(page_num)
                page_text = page.get_text()
                if page_text:
                    extracted_pages.append(page_text.strip())
            doc.close()
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Failed to parse PDF document. File may be corrupted. Error: {str(e)}"
            )
    elif pypdf is not None:
        try:
            stream = io.BytesIO(content)
            reader = pypdf.PdfReader(stream)
            if len(reader.pages) == 0:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="The PDF contains 0 pages."
                )
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    extracted_pages.append(page_text.strip())
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Failed to parse PDF document. File may be corrupted. Error: {str(e)}"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No PDF extraction library available on the server."
        )

    full_text = "\n\n".join(extracted_pages).strip()

    if not full_text or len(full_text) < 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "No selectable text found in the PDF. This document appears to be scanned or contains "
                "only images. Scanned PDFs require an OCR (Optical Character Recognition) pipeline, "
                "which is not supported. Please upload a digital text-based PDF, TXT, or DOCX document."
            )
        )

    return full_text


def extract_text_from_docx(content: bytes) -> str:
    """
    Extracts text from DOCX bytes including paragraphs and table contents.
    """
    try:
        doc_stream = io.BytesIO(content)
        doc = docx.Document(doc_stream)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to parse DOCX document. File may be corrupted. Error: {str(e)}"
        )

    text_parts = []

    # Extract paragraphs
    for p in doc.paragraphs:
        p_text = p.text.strip()
        if p_text:
            text_parts.append(p_text)

    # Extract tables
    for table in doc.tables:
        for row in table.rows:
            row_text = [cell.text.strip() for cell in row.cells if cell.text.strip()]
            if row_text:
                text_parts.append(" | ".join(row_text))

    full_text = "\n\n".join(text_parts).strip()

    if not full_text or len(full_text) < 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No readable text found in the DOCX document. The document may be empty or contain only graphics."
        )

    return full_text


def extract_text_from_txt(content: bytes) -> str:
    """
    Decodes TXT file bytes safely trying utf-8, latin-1, utf-16, and cp1252 encodings.
    """
    encodings = ["utf-8", "utf-8-sig", "latin-1", "cp1252", "utf-16"]
    for enc in encodings:
        try:
            decoded = content.decode(enc).strip()
            if decoded:
                return decoded
        except (UnicodeDecodeError, LookupError):
            continue

    # Fallback with replacement characters
    decoded = content.decode("utf-8", errors="replace").strip()
    if not decoded or len(decoded) < 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The TXT document could not be decoded or contains insufficient readable text."
        )
    return decoded


def extract_text(filename: str, content: bytes) -> ExtractionResult:
    """
    Main extraction pipeline: validates file, extracts text, cleans it,
    applies safe length caps, and returns an ExtractionResult.
    """
    ext = validate_file(filename, len(content))

    if ext == ".pdf":
        raw_text = extract_text_from_pdf(content)
    elif ext == ".docx":
        raw_text = extract_text_from_docx(content)
    elif ext == ".txt":
        raw_text = extract_text_from_txt(content)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format '{ext}'."
        )

    cleaned = clean_extracted_text(raw_text)

    if not cleaned or len(cleaned) < 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The document does not contain sufficient extractable text (minimum 10 characters required)."
        )

    truncated = False
    if len(cleaned) > settings.MAX_EXTRACTED_TEXT_CHARS:
        cleaned = cleaned[:settings.MAX_EXTRACTED_TEXT_CHARS]
        truncated = True

    words = re.findall(r"\b\w+\b", cleaned)
    word_count = len(words)
    char_count = len(cleaned)

    return ExtractionResult(
        text=cleaned,
        word_count=word_count,
        char_count=char_count,
        truncated=truncated
    )
