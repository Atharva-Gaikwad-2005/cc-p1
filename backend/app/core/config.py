import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application configuration loaded from environment variables and .env file.
    Follows 12-factor configuration principles.
    """
    # Core Application Settings
    APP_NAME: str = "DocuMind AI"
    APP_VERSION: str = "1.0.0"
    APP_MODE: str = "demo"  # 'demo' or 'aws'
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    # Document Constraints
    MAX_FILE_SIZE_MB: int = 10
    MAX_EXTRACTED_TEXT_CHARS: int = 50000

    # AWS Configuration
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: Optional[str] = None
    SAGEMAKER_ENDPOINT_NAME: Optional[str] = None
    SAGEMAKER_PAYLOAD_FORMAT: str = "huggingface"  # 'huggingface', 'jumpstart', 'custom_json'

    # Optional explicit AWS Credentials (prefer IAM Role or standard AWS Profile in production)
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_SESSION_TOKEN: Optional[str] = None

    # Storage settings
    LOCAL_STORAGE_DIR: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "data"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def is_aws_mode(self) -> bool:
        return self.APP_MODE.strip().lower() == "aws"

    @property
    def cors_origins(self) -> List[str]:
        if not self.ALLOWED_ORIGINS:
            return ["*"]
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024


settings = Settings()
