import os
import shutil
import tempfile
import pytest
from app.services.storage_service import LocalStorageService


@pytest.fixture
def temp_storage():
    tmp_dir = tempfile.mkdtemp()
    storage = LocalStorageService(base_dir=tmp_dir)
    yield storage
    shutil.rmtree(tmp_dir, ignore_errors=True)


def test_local_storage_lifecycle(temp_storage):
    # Save document
    doc_id = "doc-123"
    content = b"Sample document bytes content"
    uri = temp_storage.save_document(doc_id, "contract.txt", content)
    assert uri.startswith("local://documents/doc-123/")

    # Retrieve document
    retrieved, orig_name = temp_storage.get_document(doc_id)
    assert retrieved == content
    assert orig_name == "contract.txt"

    # Save summary
    summary_id = "sum-456"
    summary_data = {
        "summary_id": summary_id,
        "document_id": doc_id,
        "filename": "contract.txt",
        "created_at": "2026-10-10T12:00:00Z",
        "length": "medium",
        "format": "paragraph",
        "summary_text": "This is a contract summary.",
    }
    sum_uri = temp_storage.save_summary(summary_id, doc_id, summary_data)
    assert sum_uri.startswith("local://summaries/doc-123/")

    # Get summary
    sum_item = temp_storage.get_summary(summary_id)
    assert sum_item is not None
    assert sum_item["summary_text"] == "This is a contract summary."

    # List summaries
    history = temp_storage.list_summaries()
    assert len(history) == 1
    assert history[0]["summary_id"] == summary_id

    # Delete summary
    deleted = temp_storage.delete_summary(summary_id)
    assert deleted is True

    # Ensure removed
    assert temp_storage.get_summary(summary_id) is None
    assert len(temp_storage.list_summaries()) == 0
    assert temp_storage.get_document(doc_id) is None
