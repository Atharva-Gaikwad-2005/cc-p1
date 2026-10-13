from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class SummaryLength(str, Enum):
    SHORT = "short"
    MEDIUM = "medium"
    DETAILED = "detailed"


class SummaryFormat(str, Enum):
    PARAGRAPH = "paragraph"
    BULLET_POINTS = "bullet_points"
    KEY_TAKEAWAYS = "key_takeaways"


class DocumentPreviewResponse(BaseModel):
    document_id: str
    filename: str
    file_size: int
    file_type: str
    char_count: int
    word_count: int
    preview_text: str
    full_text: str
    truncated: bool = False


class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    file_size: int
    file_type: str
    storage_location: str
    uploaded_at: str


class SummaryGenerateRequest(BaseModel):
    document_id: Optional[str] = None
    filename: str = Field(default="untitled_document.txt", min_length=1)
    text: str = Field(..., min_length=10, description="The extracted text to summarize")
    length: SummaryLength = Field(default=SummaryLength.MEDIUM)
    format: SummaryFormat = Field(default=SummaryFormat.PARAGRAPH)


class SummaryResponse(BaseModel):
    summary_id: str
    document_id: str
    filename: str
    created_at: str
    length: SummaryLength
    format: SummaryFormat
    summary_text: str
    key_points: List[str] = Field(default_factory=list)
    keywords: List[str] = Field(default_factory=list)
    model_used: str
    storage_location: str
    saved: bool = True
    original_word_count: int
    summary_word_count: int
    compression_ratio: float  # e.g., 72.5%


class SummaryHistoryItem(BaseModel):
    summary_id: str
    document_id: str
    filename: str
    created_at: str
    length: SummaryLength
    format: SummaryFormat
    summary_preview: str
    model_used: str
    storage_location: str


class ConfigStatusResponse(BaseModel):
    app_mode: str  # "demo" or "aws"
    aws_configured: bool
    aws_region: Optional[str] = None
    s3_bucket: Optional[str] = None
    s3_connected: bool
    s3_status_message: str
    sagemaker_endpoint: Optional[str] = None
    sagemaker_connected: bool
    sagemaker_status_message: str
    max_file_size_mb: int
    supported_file_types: List[str]
    status_description: str
