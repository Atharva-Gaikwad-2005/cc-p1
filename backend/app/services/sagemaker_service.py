import json
import logging
import re
from typing import List, Tuple, Optional, Dict, Any
from botocore.exceptions import ClientError, EndpointConnectionError
import boto3

from app.core.config import settings
from app.models.schemas import SummaryFormat, SummaryLength

logger = logging.getLogger(__name__)


class SageMakerSummarizationService:
    """
    Adapter and orchestrator for Amazon SageMaker AI Model Endpoints.
    Supports multiple payload formats (HuggingFace, JumpStart, Custom JSON),
    implements chunking for long documents, and surfaces transparent AWS errors.
    """

    def __init__(self):
        self.region = settings.AWS_REGION
        self.endpoint_name = settings.SAGEMAKER_ENDPOINT_NAME
        self.payload_format = settings.SAGEMAKER_PAYLOAD_FORMAT

    def get_runtime_client(self):
        """
        Creates Boto3 SageMaker Runtime client with configured or environment credentials.
        """
        client_kwargs: Dict[str, Any] = {"region_name": self.region}
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            client_kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
            client_kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
            if settings.AWS_SESSION_TOKEN:
                client_kwargs["aws_session_token"] = settings.AWS_SESSION_TOKEN

        return boto3.client("sagemaker-runtime", **client_kwargs)

    def get_sagemaker_client(self):
        """
        Creates Boto3 SageMaker management client for endpoint status inspection.
        """
        client_kwargs: Dict[str, Any] = {"region_name": self.region}
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            client_kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
            client_kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
            if settings.AWS_SESSION_TOKEN:
                client_kwargs["aws_session_token"] = settings.AWS_SESSION_TOKEN

        return boto3.client("sagemaker", **client_kwargs)

    def check_endpoint_status(self) -> Tuple[bool, str]:
        """
        Verifies whether the configured SageMaker endpoint exists and is in 'InService' state.
        Never throws unhandled exceptions; returns (is_ready, descriptive_status).
        """
        if not self.endpoint_name:
            return False, "SAGEMAKER_ENDPOINT_NAME is not configured."

        try:
            sm_client = self.get_sagemaker_client()
            resp = sm_client.describe_endpoint(EndpointName=self.endpoint_name)
            status_val = resp.get("EndpointStatus", "Unknown")
            if status_val == "InService":
                return True, f"Endpoint '{self.endpoint_name}' is InService (Ready for inference)."
            return False, f"Endpoint '{self.endpoint_name}' is in '{status_val}' state."
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "ClientError")
            error_msg = e.response.get("Error", {}).get("Message", str(e))
            return False, f"SageMaker Error [{error_code}]: {error_msg}"
        except Exception as e:
            return False, f"SageMaker connection error: {str(e)}"

    def _build_payload(self, text: str, length: SummaryLength, format_type: SummaryFormat) -> Tuple[bytes, str]:
        """
        Adapts prompt parameters into the target model payload format.
        """
        # Configure length generation targets
        length_params = {
            SummaryLength.SHORT: {"min_length": 30, "max_length": 90, "max_tokens": 128},
            SummaryLength.MEDIUM: {"min_length": 90, "max_length": 250, "max_tokens": 300},
            SummaryLength.DETAILED: {"min_length": 250, "max_length": 500, "max_tokens": 600},
        }[length]

        # Style instruction prefix for models that accept system/instruction prompts
        style_prompt_map = {
            SummaryFormat.PARAGRAPH: "Write a cohesive paragraph summary.",
            SummaryFormat.BULLET_POINTS: "Summarize as organized bullet points starting with '• '.",
            SummaryFormat.KEY_TAKEAWAYS: "Summarize as numbered key takeaways highlighting actionable insights.",
        }
        style_instruction = style_prompt_map[format_type]

        if self.payload_format == "huggingface":
            # Standard HuggingFace Transformers summarization pipeline payload
            payload = {
                "inputs": text,
                "parameters": {
                    "min_length": length_params["min_length"],
                    "max_length": length_params["max_length"],
                    "do_sample": False,
                }
            }
        elif self.payload_format == "jumpstart":
            # JumpStart LLM instruction format
            prompt = (
                f"Instruction: {style_instruction}\n"
                f"Document text:\n{text}\n\n"
                f"Summary:"
            )
            payload = {
                "inputs": prompt,
                "parameters": {
                    "max_new_tokens": length_params["max_tokens"],
                    "temperature": 0.3,
                    "top_p": 0.9,
                }
            }
        else:
            # Custom JSON generic format
            payload = {
                "text": text,
                "length": length.value,
                "format": format_type.value,
                "instruction": style_instruction,
                "parameters": length_params,
            }

        return json.dumps(payload).encode("utf-8"), "application/json"

    def _parse_response(self, response_body: bytes) -> str:
        """
        Parses response from SageMaker endpoint based on common model schemas.
        """
        try:
            decoded = json.loads(response_body.decode("utf-8"))
        except Exception:
            # Try raw text
            return response_body.decode("utf-8", errors="replace").strip()

        # HuggingFace pipeline format: [{"summary_text": "..."}]
        if isinstance(decoded, list) and len(decoded) > 0 and isinstance(decoded[0], dict):
            if "summary_text" in decoded[0]:
                return decoded[0]["summary_text"].strip()
            if "generated_text" in decoded[0]:
                return decoded[0]["generated_text"].strip()

        # JumpStart format: {"generated_text": "..."} or {"generation": "..."}
        if isinstance(decoded, dict):
            for key in ["summary_text", "summary", "generated_text", "generation", "output"]:
                if key in decoded and isinstance(decoded[key], str):
                    return decoded[key].strip()

        # If it's a raw string
        if isinstance(decoded, str):
            return decoded.strip()

        return str(decoded)

    def _chunk_text(self, text: str, max_chunk_words: int = 700) -> List[str]:
        """
        Splits lengthy text into manageable overlapping chunks for inference.
        """
        words = text.split()
        if len(words) <= max_chunk_words:
            return [text]

        chunks = []
        step = max_chunk_words - 50  # 50 words overlap
        for i in range(0, len(words), step):
            chunk = " ".join(words[i:i + max_chunk_words])
            if chunk:
                chunks.append(chunk)
            if i + max_chunk_words >= len(words):
                break

        return chunks

    def summarize_document(
        self,
        text: str,
        length: SummaryLength = SummaryLength.MEDIUM,
        format_type: SummaryFormat = SummaryFormat.PARAGRAPH,
    ) -> Tuple[str, List[str], List[str]]:
        """
        Invokes Amazon SageMaker AI inference endpoint.
        Uses document chunking if length exceeds 800 words.
        Returns: (summary_text, key_points, keywords)
        """
        if not self.endpoint_name:
            raise ValueError(
                "SAGEMAKER_ENDPOINT_NAME is not configured. Please set the endpoint name in backend/.env."
            )

        client = self.get_runtime_client()
        chunks = self._chunk_text(text, max_chunk_words=800)

        intermediate_summaries = []
        for idx, chunk in enumerate(chunks):
            payload_data, content_type = self._build_payload(chunk, length, format_type)
            try:
                response = client.invoke_endpoint(
                    EndpointName=self.endpoint_name,
                    ContentType=content_type,
                    Accept="application/json",
                    Body=payload_data,
                )
                raw_body = response["Body"].read()
                parsed = self._parse_response(raw_body)
                if parsed:
                    intermediate_summaries.append(parsed)
            except ClientError as e:
                error_code = e.response.get("Error", {}).get("Code", "ClientError")
                error_msg = e.response.get("Error", {}).get("Message", str(e))
                logger.error(f"SageMaker invoke_endpoint error: {error_code} - {error_msg}")
                raise RuntimeError(
                    f"Amazon SageMaker inference failed [{error_code}]: {error_msg}. "
                    f"Check endpoint '{self.endpoint_name}' status and IAM permissions."
                )
            except EndpointConnectionError as e:
                logger.error(f"SageMaker connection error: {str(e)}")
                raise RuntimeError(
                    f"Failed to connect to SageMaker endpoint in region '{self.region}'. "
                    f"Check network connectivity and endpoint status."
                )
            except Exception as e:
                logger.error(f"Unexpected SageMaker error: {str(e)}")
                raise RuntimeError(f"Unexpected SageMaker invocation error: {str(e)}")

        # If multi-chunk, join and post-format
        if len(intermediate_summaries) > 1:
            combined_summary = "\n\n".join(intermediate_summaries)
        elif intermediate_summaries:
            combined_summary = intermediate_summaries[0]
        else:
            raise RuntimeError("SageMaker returned empty summary output.")

        # Post-format bullet or key takeaways if not formatted by the model
        final_summary = combined_summary
        if format_type == SummaryFormat.BULLET_POINTS and "•" not in final_summary:
            lines = [l.strip() for l in re.split(r"(?<=[.!?])\s+", final_summary) if len(l.strip()) > 15]
            final_summary = "\n".join([f"• {line}" for line in lines])
        elif format_type == SummaryFormat.KEY_TAKEAWAYS and not re.search(r"^\d+\.", final_summary, re.M):
            lines = [l.strip() for l in re.split(r"(?<=[.!?])\s+", final_summary) if len(l.strip()) > 15]
            final_summary = "\n\n".join([f"{i+1}. {line}" for i, line in enumerate(lines)])

        # Extract salient points and keywords for user cards
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", final_summary) if len(s.strip()) > 10]
        key_points = [re.sub(r"^[•\-\*0-9.]+\s*", "", s).strip() for s in sentences[:5]]

        # Keywords extracted from original text
        words = re.findall(r"\b[a-zA-Z]{4,}\b", text.lower())
        from collections import Counter
        from app.services.demo_summarizer import STOPWORDS
        meaningful = [w.capitalize() for w in words if w not in STOPWORDS]
        keywords = [w for w, _ in Counter(meaningful).most_common(6)]

        return final_summary, key_points, keywords
