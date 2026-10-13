# System Architecture: Intelligent Document Summarizer (DocuMind AI)

## 1. High-Level Architecture

DocuMind AI is architected as a cloud-native, decoupled full-stack platform designed to summarize business, legal, and academic documents reliably. It features a **dual-mode operational engine**:
1. **AWS Production Mode**: Connects to **Amazon S3** for secure object storage and **Amazon SageMaker AI** for deep learning inference.
2. **Demo Mode**: Completely self-contained offline mode providing extractive NLP summarization and local file persistence, suitable for testing and classroom evaluation.

```mermaid
graph TB
    subgraph ClientLayer ["Client Presentation Tier (Browser)"]
        UI["React 18 + TypeScript SPA<br/>(Tailwind CSS, Lucide Icons)"]
    end

    subgraph APILayer ["Backend Application Tier (FastAPI)"]
        API["FastAPI REST Server<br/>(Uvicorn ASGI)"]
        VAL["Pydantic v2 Validation<br/>& MIME/Size Guards"]
        EXT["Document Extraction Engine<br/>(PyMuPDF, python-docx, TXT Decoders)"]
        MODE_ROUTER{"APP_MODE Router"}
    end

    subgraph DemoEngines ["Local Services (Demo Mode)"]
        NLP["Extractive NLP Summarizer<br/>(TF-IDF / Positional Scoring)"]
        LOCAL_STORE["Local Filesystem Storage<br/>(JSON & Original Documents)"]
    end

    subgraph AWSEngines ["Amazon Web Services (AWS Mode)"]
        S3_CLIENT["Boto3 S3 Client"]
        SM_CLIENT["Boto3 SageMaker Runtime Client"]
        S3_BUCKET[("Amazon S3 Private Bucket<br/>(Documents & Summaries)")]
        SM_ENDPOINT["Amazon SageMaker AI<br/>Model Endpoint (InService)"]
        CW["Amazon CloudWatch Logs"]
    end

    UI -->|HTTPS / REST API| API
    API --> VAL
    VAL --> EXT
    EXT --> MODE_ROUTER

    MODE_ROUTER -->|APP_MODE=demo| NLP
    MODE_ROUTER -->|APP_MODE=demo| LOCAL_STORE

    MODE_ROUTER -->|APP_MODE=aws| SM_CLIENT
    MODE_ROUTER -->|APP_MODE=aws| S3_CLIENT
    SM_CLIENT -->|invoke_endpoint| SM_ENDPOINT
    S3_CLIENT -->|put_object / get_object| S3_BUCKET
    SM_ENDPOINT -.-> CW
```

---

## 2. Data Flow & Sequence Workflows

### A. Document Upload & Extraction Workflow

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Browser
    participant API as FastAPI Backend
    participant Ext as Document Extractor
    participant Store as Storage Provider (S3 / Local)

    User->>API: POST /api/documents/preview (Multipart File)
    API->>Ext: Validate Extension (.pdf, .txt, .docx) & Size (<=10MB)
    alt Invalid format or > 10MB
        Ext-->>API: Raise HTTP 400 or 413
        API-->>User: Structured Error Response
    end
    alt PDF Document
        Ext->>Ext: PyMuPDF fitz.open(stream) -> Extract Pages
        Ext->>Ext: Detect Image-Only / Scanned PDF (Raise 422 if no selectable text)
    else DOCX Document
        Ext->>Ext: python-docx -> Extract Paragraphs & Tables
    else TXT Document
        Ext->>Ext: Safe multi-encoding decode (UTF-8, Latin-1, CP1252)
    end
    Ext->>Ext: Sanitize & Truncate at safe cap (50,000 chars)
    API-->>User: 200 OK (Preview snippet, full text, word & char counts)
```

---

### B. Summarization & Persistence Workflow

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Browser
    participant API as FastAPI Backend
    participant SM as SageMaker Service
    participant Demo as Demo NLP Engine
    participant Store as Storage Provider

    User->>API: POST /api/summaries/generate (text, length, format)
    alt APP_MODE == "aws"
        API->>SM: summarize_document(text, length, format)
        SM->>SM: Partition long text into overlapping chunks
        SM->>SM: Serialize payload (HuggingFace / JumpStart format)
        SM->>SM: Boto3 invoke_endpoint(EndpointName)
        alt SageMaker Error / Timeout
            SM-->>API: Raise RuntimeError with AWS Error Code
            API-->>User: 502 Bad Gateway (Transparent AWS Error)
        end
        SM->>SM: Parse model summary & extract salient points
        API->>Store: S3 put_object (summary.json & summary.txt)
    else APP_MODE == "demo"
        API->>Demo: generate_demo_summary(text, length, format)
        Demo->>Demo: Sentence tokenization & Term-Frequency salience
        Demo->>Demo: Format output (Paragraph / Bullet Points / Key Takeaways)
        API->>Store: Save to backend/data/ (summary.json & summary.txt)
    end
    Store-->>API: Storage URI (s3://... or local://...)
    API-->>User: 200 OK (Summary text, key points, keywords, metrics)
```

---

## 3. Storage Hierarchy

Amazon S3 objects (and mirrored local storage folders) are partitioned by a unique UUID `document_id` rather than trusting client-supplied file paths:

```
s3://<S3_BUCKET_NAME>/
├── documents/
│   └── <document_id>/
│       └── original.<pdf|txt|docx>   [Content-Type, Metadata: original-filename]
└── summaries/
    └── <document_id>/
        ├── summary.json              [Structured metadata, metrics, key points]
        └── summary.txt               [Clean plaintext representation]
```

### Security Considerations:
- **No Path Traversal**: User-supplied filenames are never used as S3 object keys or filesystem paths.
- **Private Access**: The S3 bucket disables public access (`BlockPublicAcls`, `BlockPublicPolicy`, `IgnorePublicAcls`, `RestrictPublicBuckets`).
- **Encrypted at Rest**: Uses server-side encryption (SSE-S3 or SSE-KMS).
- **Preserved Metadata**: Original filename and MIME types are stored strictly within object metadata tags.

---

## 4. Amazon SageMaker Model Adapter & Long-Document Chunking

SageMaker endpoints vary in their payload specifications. The service provides an adaptable interface:
- **HuggingFace Pipeline Format** (e.g. `facebook/bart-large-cnn`, `google/flan-t5-large`):
  ```json
  {
    "inputs": "<chunk_text>",
    "parameters": {
      "min_length": 90,
      "max_length": 250,
      "do_sample": false
    }
  }
  ```
- **JumpStart LLM Prompt Format** (e.g. `meta-vllm-llama-3-8b-instruct`):
  ```json
  {
    "inputs": "Instruction: Summarize as organized bullet points.\nDocument:\n<chunk_text>\n\nSummary:",
    "parameters": {
      "max_new_tokens": 300,
      "temperature": 0.3
    }
  }
  ```

### Map-Reduce Chunking Strategy for Documents:
1. Documents exceeding 800 words are partitioned into sliding windows with a 50-word overlap to maintain contextual continuity across chunk boundaries.
2. Each chunk is submitted to the inference endpoint.
3. Intermediate summaries are aggregated and normalized into the requested style (`paragraph`, `bullet_points`, or `key_takeaways`).
