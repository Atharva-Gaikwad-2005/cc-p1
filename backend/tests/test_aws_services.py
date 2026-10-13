import json
from unittest.mock import MagicMock, patch
import pytest
from botocore.exceptions import ClientError

from app.models.schemas import SummaryFormat, SummaryLength
from app.services.sagemaker_service import SageMakerSummarizationService
from app.services.storage_service import S3StorageService


# --- SageMaker Tests ---

def test_sagemaker_payload_building_huggingface():
    sm_service = SageMakerSummarizationService()
    sm_service.payload_format = "huggingface"

    payload_bytes, content_type = sm_service._build_payload(
        "Short document for testing.",
        SummaryLength.SHORT,
        SummaryFormat.PARAGRAPH,
    )
    assert content_type == "application/json"
    data = json.loads(payload_bytes.decode("utf-8"))
    assert "inputs" in data
    assert "parameters" in data
    assert data["parameters"]["max_length"] == 90


def test_sagemaker_payload_building_jumpstart():
    sm_service = SageMakerSummarizationService()
    sm_service.payload_format = "jumpstart"

    payload_bytes, content_type = sm_service._build_payload(
        "Document test body.",
        SummaryLength.MEDIUM,
        SummaryFormat.BULLET_POINTS,
    )
    assert content_type == "application/json"
    data = json.loads(payload_bytes.decode("utf-8"))
    assert "Instruction:" in data["inputs"]
    assert "Document test body." in data["inputs"]


def test_sagemaker_response_parsing():
    sm_service = SageMakerSummarizationService()

    # HuggingFace list format
    hf_resp = json.dumps([{"summary_text": "Huggingface generated summary."}]).encode("utf-8")
    assert sm_service._parse_response(hf_resp) == "Huggingface generated summary."

    # JumpStart dictionary format
    js_resp = json.dumps({"generated_text": "Jumpstart generated summary."}).encode("utf-8")
    assert sm_service._parse_response(js_resp) == "Jumpstart generated summary."

    # Direct raw text
    raw_resp = b"Direct raw response string."
    assert sm_service._parse_response(raw_resp) == "Direct raw response string."


@patch("boto3.client")
def test_sagemaker_summarize_success(mock_boto_client):
    mock_runtime = MagicMock()
    # Mock Body.read()
    mock_body = MagicMock()
    mock_body.read.return_value = json.dumps([{"summary_text": "SageMaker summarized document successfully."}]).encode("utf-8")
    mock_runtime.invoke_endpoint.return_value = {"Body": mock_body}
    mock_boto_client.return_value = mock_runtime

    sm_service = SageMakerSummarizationService()
    sm_service.endpoint_name = "test-summarizer-endpoint"

    summary, key_points, keywords = sm_service.summarize_document(
        "A long research document text explaining machine learning on AWS cloud.",
        SummaryLength.MEDIUM,
        SummaryFormat.PARAGRAPH,
    )

    assert "SageMaker summarized document successfully." in summary
    assert mock_runtime.invoke_endpoint.called


@patch("boto3.client")
def test_sagemaker_inference_failure_raises_error(mock_boto_client):
    mock_runtime = MagicMock()
    mock_runtime.invoke_endpoint.side_effect = ClientError(
        {"Error": {"Code": "ModelError", "Message": "Out of memory on endpoint"}},
        "invoke_endpoint"
    )
    mock_boto_client.return_value = mock_runtime

    sm_service = SageMakerSummarizationService()
    sm_service.endpoint_name = "test-summarizer-endpoint"

    with pytest.raises(RuntimeError) as exc_info:
        sm_service.summarize_document("Sample document.", SummaryLength.SHORT, SummaryFormat.PARAGRAPH)

    assert "Amazon SageMaker inference failed [ModelError]" in str(exc_info.value)


def test_sagemaker_missing_endpoint():
    sm_service = SageMakerSummarizationService()
    sm_service.endpoint_name = None

    with pytest.raises(ValueError) as exc_info:
        sm_service.summarize_document("Sample document.", SummaryLength.SHORT, SummaryFormat.PARAGRAPH)

    assert "SAGEMAKER_ENDPOINT_NAME is not configured" in str(exc_info.value)


# --- S3 Tests ---

@patch("boto3.client")
def test_s3_save_document_success(mock_boto_client):
    mock_s3 = MagicMock()
    mock_boto_client.return_value = mock_s3

    s3_service = S3StorageService()
    s3_service.bucket_name = "test-bucket"

    uri = s3_service.save_document("doc-1", "paper.pdf", b"pdf data bytes")
    assert uri == "s3://test-bucket/documents/doc-1/original.pdf"
    assert mock_s3.put_object.called


@patch("boto3.client")
def test_s3_health_check_success(mock_boto_client):
    mock_s3 = MagicMock()
    mock_boto_client.return_value = mock_s3

    s3_service = S3StorageService()
    s3_service.bucket_name = "test-bucket"

    is_healthy, msg = s3_service.check_health()
    assert is_healthy is True
    assert "verified and accessible" in msg


@patch("boto3.client")
def test_s3_health_check_failure(mock_boto_client):
    mock_s3 = MagicMock()
    mock_s3.head_bucket.side_effect = ClientError(
        {"Error": {"Code": "404", "Message": "Bucket Not Found"}},
        "head_bucket"
    )
    mock_boto_client.return_value = mock_s3

    s3_service = S3StorageService()
    s3_service.bucket_name = "non-existent-bucket"

    is_healthy, msg = s3_service.check_health()
    assert is_healthy is False
    assert "S3 Error [404]" in msg
