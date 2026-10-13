from datetime import datetime, timezone
import io
import os
import uuid
from typing import List
from fastapi import APIRouter, File, UploadFile, HTTPException, status, Response

from app.core.config import settings
from app.models.schemas import (
    DocumentPreviewResponse,
    DocumentUploadResponse,
    SummaryGenerateRequest,
    SummaryResponse,
    SummaryHistoryItem,
    ConfigStatusResponse,
)
from app.services.extractor import extract_text, validate_file
from app.services.demo_summarizer import generate_demo_summary
from app.services.sagemaker_service import SageMakerSummarizationService
from app.services.storage_service import get_storage_service

router = APIRouter(prefix="/api", tags=["Document Summarizer"])


@router.get("/health", summary="Health Check")
def health_check():
    """
    Returns API health status, application name, version, and active mode.
    """
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "mode": settings.APP_MODE,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/config/status", response_model=ConfigStatusResponse, summary="Configuration and Cloud Health")
def get_config_status():
    """
    Inspects active mode and verifies AWS connectivity.
    Never reveals sensitive keys or credentials.
    """
    storage = get_storage_service()
    s3_connected, s3_message = storage.check_health()

    sagemaker_connected = False
    sagemaker_message = "SageMaker check skipped in Demo Mode."

    if settings.is_aws_mode:
        sm_service = SageMakerSummarizationService()
        sagemaker_connected, sagemaker_message = sm_service.check_endpoint_status()

    aws_configured = bool(settings.AWS_REGION and (settings.S3_BUCKET_NAME or settings.SAGEMAKER_ENDPOINT_NAME))

    if settings.is_aws_mode:
        if s3_connected and sagemaker_connected:
            description = "AWS Mode: Connected to Amazon S3 and SageMaker endpoint."
        else:
            description = "AWS Mode: One or more AWS services are unreachable or unconfigured."
    else:
        description = "Demo Mode: Running locally with built-in extractive summarizer and local storage."

    return ConfigStatusResponse(
        app_mode=settings.APP_MODE,
        aws_configured=aws_configured,
        aws_region=settings.AWS_REGION if settings.is_aws_mode else None,
        s3_bucket=settings.S3_BUCKET_NAME if settings.is_aws_mode else None,
        s3_connected=s3_connected,
        s3_status_message=s3_message,
        sagemaker_endpoint=settings.SAGEMAKER_ENDPOINT_NAME if settings.is_aws_mode else None,
        sagemaker_connected=sagemaker_connected,
        sagemaker_status_message=sagemaker_message,
        max_file_size_mb=settings.MAX_FILE_SIZE_MB,
        supported_file_types=[".pdf", ".txt", ".docx"],
        status_description=description,
    )


@router.post("/documents/preview", response_model=DocumentPreviewResponse, summary="Extract and Preview Document Text")
async def preview_document(file: UploadFile = File(...)):
    """
    Validates uploaded document, extracts text using PyMuPDF, python-docx, or TXT decoders,
    and returns a structured text preview.
    """
    content = await file.read()
    filename = file.filename or "uploaded_document"
    
    validate_file(filename, len(content))
    result = extract_text(filename, content)

    doc_id = str(uuid.uuid4())
    _, ext = os.path.splitext(filename.lower())

    # Generate preview snippet (first 1500 chars)
    preview_snippet = result.text[:1500] + ("..." if len(result.text) > 1500 else "")

    return DocumentPreviewResponse(
        document_id=doc_id,
        filename=filename,
        file_size=len(content),
        file_type=ext.upper().replace(".", ""),
        char_count=result.char_count,
        word_count=result.word_count,
        preview_text=preview_snippet,
        full_text=result.text,
        truncated=result.truncated,
    )


@router.post("/documents/upload", response_model=DocumentUploadResponse, summary="Upload Document to Storage")
async def upload_document(file: UploadFile = File(...)):
    """
    Uploads document to Amazon S3 (in AWS mode) or local storage (in Demo mode).
    """
    content = await file.read()
    filename = file.filename or "uploaded_document"
    
    validate_file(filename, len(content))
    
    doc_id = str(uuid.uuid4())
    storage = get_storage_service()
    
    try:
        storage_uri = storage.save_document(doc_id, filename, content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to persist document to storage: {str(e)}"
        )

    _, ext = os.path.splitext(filename.lower())
    return DocumentUploadResponse(
        document_id=doc_id,
        filename=filename,
        file_size=len(content),
        file_type=ext.upper().replace(".", ""),
        storage_location=storage_uri,
        uploaded_at=datetime.now(timezone.utc).isoformat(),
    )


@router.post("/summaries/generate", response_model=SummaryResponse, summary="Generate AI Document Summary")
def generate_summary(req: SummaryGenerateRequest):
    """
    Generates summary using configured model (SageMaker AI endpoint in AWS mode,
    or high-fidelity extractive summarizer in Demo mode).
    Persists summary to storage and records metrics.
    """
    if not req.text or len(req.text.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document text must contain at least 10 characters to generate a summary."
        )

    document_id = req.document_id or str(uuid.uuid4())
    summary_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()

    original_words = len(req.text.split())

    if settings.is_aws_mode:
        sm_service = SageMakerSummarizationService()
        try:
            summary_text, key_points, keywords = sm_service.summarize_document(
                text=req.text,
                length=req.length,
                format_type=req.format,
            )
            model_used = f"Amazon SageMaker ({settings.SAGEMAKER_ENDPOINT_NAME or 'Default Endpoint'})"
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"SageMaker Inference Failure: {str(e)}"
            )
    else:
        summary_text, key_points, keywords = generate_demo_summary(
            text=req.text,
            length=req.length,
            format_type=req.format,
        )
        model_used = "Local Extractive Summarizer (Demo Mode)"

    summary_words = len(summary_text.split())
    compression = round(max(0.0, (1 - (summary_words / max(original_words, 1)))) * 100, 1)

    # Persist summary
    storage = get_storage_service()
    summary_data = {
        "summary_id": summary_id,
        "document_id": document_id,
        "filename": req.filename,
        "created_at": created_at,
        "length": req.length.value,
        "format": req.format.value,
        "summary_text": summary_text,
        "key_points": key_points,
        "keywords": keywords,
        "model_used": model_used,
        "original_word_count": original_words,
        "summary_word_count": summary_words,
        "compression_ratio": compression,
    }

    try:
        storage_uri = storage.save_summary(summary_id, document_id, summary_data)
        summary_data["storage_location"] = storage_uri
    except Exception as e:
        # Non-fatal storage error warning
        summary_data["storage_location"] = f"unpersisted ({str(e)})"

    return SummaryResponse(
        summary_id=summary_id,
        document_id=document_id,
        filename=req.filename,
        created_at=created_at,
        length=req.length,
        format=req.format,
        summary_text=summary_text,
        key_points=key_points,
        keywords=keywords,
        model_used=model_used,
        storage_location=summary_data.get("storage_location", "local"),
        saved=True,
        original_word_count=original_words,
        summary_word_count=summary_words,
        compression_ratio=compression,
    )


@router.get("/summaries", response_model=List[SummaryHistoryItem], summary="Get Summary History")
def get_summary_history():
    """
    Returns list of all saved summary records from S3 or local storage.
    """
    storage = get_storage_service()
    records = storage.list_summaries()

    history_items = []
    for item in records:
        full_text = item.get("summary_text", "")
        preview = full_text[:200] + ("..." if len(full_text) > 200 else "")
        history_items.append(
            SummaryHistoryItem(
                summary_id=item.get("summary_id", ""),
                document_id=item.get("document_id", ""),
                filename=item.get("filename", "Untitled Document"),
                created_at=item.get("created_at", ""),
                length=item.get("length", "medium"),
                format=item.get("format", "paragraph"),
                summary_preview=preview,
                model_used=item.get("model_used", "Unknown"),
                storage_location=item.get("storage_location", "local"),
            )
        )

    return history_items


@router.get("/summaries/{summary_id}", response_model=SummaryResponse, summary="Get Summary By ID")
def get_summary_by_id(summary_id: str):
    """
    Retrieves full summary details for a specific summary ID.
    """
    storage = get_storage_service()
    item = storage.get_summary(summary_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Summary with ID '{summary_id}' not found."
        )

    return SummaryResponse(
        summary_id=item["summary_id"],
        document_id=item.get("document_id", ""),
        filename=item.get("filename", "Untitled Document"),
        created_at=item.get("created_at", ""),
        length=item.get("length", "medium"),
        format=item.get("format", "paragraph"),
        summary_text=item.get("summary_text", ""),
        key_points=item.get("key_points", []),
        keywords=item.get("keywords", []),
        model_used=item.get("model_used", "Unknown"),
        storage_location=item.get("storage_location", "local"),
        saved=True,
        original_word_count=item.get("original_word_count", 0),
        summary_word_count=item.get("summary_word_count", 0),
        compression_ratio=item.get("compression_ratio", 0.0),
    )


@router.delete("/summaries/{summary_id}", summary="Delete Summary and Document")
def delete_summary(summary_id: str):
    """
    Deletes summary record and associated document files from storage.
    """
    storage = get_storage_service()
    deleted = storage.delete_summary(summary_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Summary with ID '{summary_id}' was not found or has already been deleted."
        )

    return {"success": True, "message": f"Summary '{summary_id}' and associated files deleted successfully."}


@router.get("/documents/{document_id}", summary="Retrieve Raw Document")
def get_document_raw(document_id: str):
    """
    Retrieves uploaded document bytes for viewing or download.
    """
    storage = get_storage_service()
    doc_res = storage.get_document(document_id)
    if not doc_res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' not found."
        )

    content, filename = doc_res
    _, ext = os.path.splitext(filename.lower())
    content_type_map = {
        ".pdf": "application/pdf",
        ".txt": "text/plain",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    content_type = content_type_map.get(ext, "application/octet-stream")

    return Response(
        content=content,
        media_type=content_type,
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )
