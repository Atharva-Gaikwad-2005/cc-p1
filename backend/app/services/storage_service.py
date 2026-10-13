import json
import logging
import os
import shutil
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Tuple
import boto3
from botocore.exceptions import ClientError

from app.core.config import settings

logger = logging.getLogger(__name__)


class BaseStorageService(ABC):
    """
    Abstract interface for document and summary persistence.
    """

    @abstractmethod
    def save_document(self, document_id: str, filename: str, content: bytes) -> str:
        """Saves uploaded document bytes and returns storage URI."""
        pass

    @abstractmethod
    def get_document(self, document_id: str) -> Optional[Tuple[bytes, str]]:
        """Retrieves document bytes and original filename."""
        pass

    @abstractmethod
    def save_summary(self, summary_id: str, document_id: str, summary_data: Dict[str, Any]) -> str:
        """Saves summary JSON and TXT, returns storage URI."""
        pass

    @abstractmethod
    def get_summary(self, summary_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a single summary by summary_id."""
        pass

    @abstractmethod
    def list_summaries(self) -> List[Dict[str, Any]]:
        """Lists all stored summary records."""
        pass

    @abstractmethod
    def delete_summary(self, summary_id: str) -> bool:
        """Deletes summary and associated documents."""
        pass

    @abstractmethod
    def check_health(self) -> Tuple[bool, str]:
        """Validates storage backend connectivity and readiness."""
        pass


class LocalStorageService(BaseStorageService):
    """
    Local filesystem storage provider for Demo Mode.
    Stores files and metadata locally in data/ directory.
    """

    def __init__(self, base_dir: str = settings.LOCAL_STORAGE_DIR):
        self.base_dir = os.path.abspath(base_dir)
        self.docs_dir = os.path.join(self.base_dir, "documents")
        self.summaries_dir = os.path.join(self.base_dir, "summaries")
        self.meta_file = os.path.join(self.base_dir, "history.json")
        self._ensure_dirs()

    def _ensure_dirs(self):
        os.makedirs(self.docs_dir, exist_ok=True)
        os.makedirs(self.summaries_dir, exist_ok=True)
        if not os.path.exists(self.meta_file):
            with open(self.meta_file, "w", encoding="utf-8") as f:
                json.dump([], f)

    def _read_history(self) -> List[Dict[str, Any]]:
        try:
            if os.path.exists(self.meta_file):
                with open(self.meta_file, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Error reading local history: {e}")
        return []

    def _write_history(self, history: List[Dict[str, Any]]):
        try:
            with open(self.meta_file, "w", encoding="utf-8") as f:
                json.dump(history, f, indent=2)
        except Exception as e:
            logger.error(f"Error writing local history: {e}")

    def save_document(self, document_id: str, filename: str, content: bytes) -> str:
        doc_folder = os.path.join(self.docs_dir, document_id)
        os.makedirs(doc_folder, exist_ok=True)
        
        _, ext = os.path.splitext(filename)
        safe_path = os.path.join(doc_folder, f"original{ext}")
        with open(safe_path, "wb") as f:
            f.write(content)

        # Store metadata mapping
        meta_path = os.path.join(doc_folder, "meta.json")
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump({"document_id": document_id, "original_filename": filename, "size": len(content)}, f)

        return f"local://documents/{document_id}/original{ext}"

    def get_document(self, document_id: str) -> Optional[Tuple[bytes, str]]:
        doc_folder = os.path.join(self.docs_dir, document_id)
        if not os.path.exists(doc_folder):
            return None

        meta_path = os.path.join(doc_folder, "meta.json")
        filename = "document"
        if os.path.exists(meta_path):
            with open(meta_path, "r", encoding="utf-8") as f:
                meta = json.load(f)
                filename = meta.get("original_filename", filename)

        for fname in os.listdir(doc_folder):
            if fname.startswith("original"):
                full_path = os.path.join(doc_folder, fname)
                with open(full_path, "rb") as f:
                    return f.read(), filename

        return None

    def save_summary(self, summary_id: str, document_id: str, summary_data: Dict[str, Any]) -> str:
        summary_folder = os.path.join(self.summaries_dir, document_id)
        os.makedirs(summary_folder, exist_ok=True)

        json_path = os.path.join(summary_folder, "summary.json")
        txt_path = os.path.join(summary_folder, "summary.txt")

        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(summary_data, f, indent=2)

        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(summary_data.get("summary_text", ""))

        # Update history index
        history = self._read_history()
        # Remove any existing summary with same summary_id
        history = [h for h in history if h.get("summary_id") != summary_id]
        history.insert(0, summary_data)
        self._write_history(history)

        return f"local://summaries/{document_id}/summary.json"

    def get_summary(self, summary_id: str) -> Optional[Dict[str, Any]]:
        history = self._read_history()
        for item in history:
            if item.get("summary_id") == summary_id:
                return item
        return None

    def list_summaries(self) -> List[Dict[str, Any]]:
        return self._read_history()

    def delete_summary(self, summary_id: str) -> bool:
        history = self._read_history()
        target = None
        for item in history:
            if item.get("summary_id") == summary_id:
                target = item
                break

        if not target:
            return False

        # Remove from history
        new_history = [h for h in history if h.get("summary_id") != summary_id]
        self._write_history(new_history)

        document_id = target.get("document_id")
        if document_id:
            doc_folder = os.path.join(self.docs_dir, document_id)
            if os.path.exists(doc_folder):
                shutil.rmtree(doc_folder, ignore_errors=True)

            summary_folder = os.path.join(self.summaries_dir, document_id)
            if os.path.exists(summary_folder):
                shutil.rmtree(summary_folder, ignore_errors=True)

        return True

    def check_health(self) -> Tuple[bool, str]:
        try:
            self._ensure_dirs()
            return True, f"Local Demo Storage operational ({self.base_dir})."
        except Exception as e:
            return False, f"Local storage error: {str(e)}"


class S3StorageService(BaseStorageService):
    """
    Amazon S3 storage provider for AWS Mode.
    Stores documents and summaries in private S3 bucket.
    """

    def __init__(self):
        self.bucket_name = settings.S3_BUCKET_NAME
        self.region = settings.AWS_REGION

    def get_s3_client(self):
        client_kwargs: Dict[str, Any] = {"region_name": self.region}
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            client_kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
            client_kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
            if settings.AWS_SESSION_TOKEN:
                client_kwargs["aws_session_token"] = settings.AWS_SESSION_TOKEN

        return boto3.client("s3", **client_kwargs)

    def check_health(self) -> Tuple[bool, str]:
        if not self.bucket_name:
            return False, "S3_BUCKET_NAME is not configured in backend/.env."

        try:
            client = self.get_s3_client()
            client.head_bucket(Bucket=self.bucket_name)
            return True, f"Amazon S3 bucket '{self.bucket_name}' verified and accessible."
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "ClientError")
            error_msg = e.response.get("Error", {}).get("Message", str(e))
            return False, f"S3 Error [{error_code}]: {error_msg}"
        except Exception as e:
            return False, f"S3 connection error: {str(e)}"

    def save_document(self, document_id: str, filename: str, content: bytes) -> str:
        if not self.bucket_name:
            raise ValueError("S3_BUCKET_NAME is not configured.")

        _, ext = os.path.splitext(filename)
        safe_key = f"documents/{document_id}/original{ext}"
        client = self.get_s3_client()

        try:
            client.put_object(
                Bucket=self.bucket_name,
                Key=safe_key,
                Body=content,
                Metadata={"original-filename": filename, "document-id": document_id},
                ContentType="application/octet-stream",
            )
            return f"s3://{self.bucket_name}/{safe_key}"
        except ClientError as e:
            logger.error(f"S3 put_object error: {e}")
            raise RuntimeError(f"Failed to store document in S3: {str(e)}")

    def get_document(self, document_id: str) -> Optional[Tuple[bytes, str]]:
        if not self.bucket_name:
            return None

        client = self.get_s3_client()
        prefix = f"documents/{document_id}/"

        try:
            resp = client.list_objects_v2(Bucket=self.bucket_name, Prefix=prefix)
            contents = resp.get("Contents", [])
            if not contents:
                return None

            key = contents[0]["Key"]
            obj = client.get_object(Bucket=self.bucket_name, Key=key)
            body = obj["Body"].read()
            original_filename = obj.get("Metadata", {}).get("original-filename", "document")
            return body, original_filename
        except ClientError as e:
            logger.error(f"S3 get_object error: {e}")
            return None

    def save_summary(self, summary_id: str, document_id: str, summary_data: Dict[str, Any]) -> str:
        if not self.bucket_name:
            raise ValueError("S3_BUCKET_NAME is not configured.")

        client = self.get_s3_client()
        json_key = f"summaries/{document_id}/summary.json"
        txt_key = f"summaries/{document_id}/summary.txt"

        try:
            # Store summary.json
            client.put_object(
                Bucket=self.bucket_name,
                Key=json_key,
                Body=json.dumps(summary_data, indent=2).encode("utf-8"),
                ContentType="application/json",
                Metadata={"summary-id": summary_id, "document-id": document_id},
            )
            # Store summary.txt
            client.put_object(
                Bucket=self.bucket_name,
                Key=txt_key,
                Body=summary_data.get("summary_text", "").encode("utf-8"),
                ContentType="text/plain",
            )
            return f"s3://{self.bucket_name}/{json_key}"
        except ClientError as e:
            logger.error(f"S3 save_summary error: {e}")
            raise RuntimeError(f"Failed to store summary in S3: {str(e)}")

    def get_summary(self, summary_id: str) -> Optional[Dict[str, Any]]:
        all_summaries = self.list_summaries()
        for item in all_summaries:
            if item.get("summary_id") == summary_id:
                return item
        return None

    def list_summaries(self) -> List[Dict[str, Any]]:
        if not self.bucket_name:
            return []

        client = self.get_s3_client()
        summaries = []

        try:
            paginator = client.get_paginator("list_objects_v2")
            for page in paginator.paginate(Bucket=self.bucket_name, Prefix="summaries/"):
                for obj in page.get("Contents", []):
                    key = obj["Key"]
                    if key.endswith("summary.json"):
                        try:
                            resp = client.get_object(Bucket=self.bucket_name, Key=key)
                            data = json.loads(resp["Body"].read().decode("utf-8"))
                            summaries.append(data)
                        except Exception as parse_err:
                            logger.error(f"Error parsing summary at {key}: {parse_err}")

            # Sort by created_at descending
            summaries.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            return summaries
        except ClientError as e:
            logger.error(f"S3 list_summaries error: {e}")
            return []

    def delete_summary(self, summary_id: str) -> bool:
        if not self.bucket_name:
            return False

        client = self.get_s3_client()
        target = self.get_summary(summary_id)
        if not target:
            return False

        document_id = target.get("document_id")
        if not document_id:
            return False

        try:
            # Delete summary files
            client.delete_object(Bucket=self.bucket_name, Key=f"summaries/{document_id}/summary.json")
            client.delete_object(Bucket=self.bucket_name, Key=f"summaries/{document_id}/summary.txt")

            # Delete document objects
            doc_prefix = f"documents/{document_id}/"
            resp = client.list_objects_v2(Bucket=self.bucket_name, Prefix=doc_prefix)
            for item in resp.get("Contents", []):
                client.delete_object(Bucket=self.bucket_name, Key=item["Key"])

            return True
        except ClientError as e:
            logger.error(f"S3 delete_summary error: {e}")
            return False


def get_storage_service() -> BaseStorageService:
    """
    Factory function returning the active storage provider according to APP_MODE.
    """
    if settings.is_aws_mode:
        return S3StorageService()
    return LocalStorageService()
