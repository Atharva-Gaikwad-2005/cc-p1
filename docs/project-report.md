# ACADEMIC PROJECT REPORT

## PROJECT TITLE:
**INTELLIGENT DOCUMENT SUMMARIZER ON AWS S3 + SAGEMAKER AI (DOCUMIND AI)**

---

## 1. TITLE
**Intelligent Document Summarizer on AWS S3 + SageMaker AI**  
**Application Name:** DocuMind AI  
**Domain:** Cloud Computing, Natural Language Processing, Full-Stack Web Systems  

---

## 2. ABSTRACT
In the modern digital era, individuals and organizations are inundated with extensive unstructured textual content including research papers, technical manuals, contracts, and organizational reports. Extracting actionable insights from lengthy multi-page documents manually is labor-intensive and error-prone. This project presents **DocuMind AI**, an enterprise-grade cloud-native document summarization platform architected on Amazon Web Services (AWS) and modern web technologies. 

The application provides automated ingestion and extraction of digital PDF, TXT, and Microsoft Word (DOCX) documents, transforms raw document text into clean tokens, and performs AI-driven summarization using **Amazon SageMaker AI** inference endpoints. The solution incorporates **Amazon S3** for secure, private document and summary object storage with fine-grained IAM controls. To facilitate seamless local evaluation and classroom testing without incurring AWS billing or requiring cloud credentials, the system incorporates a fully functional, self-contained **Demo Mode** featuring extractive NLP scoring. The frontend delivers an intuitive, responsive user experience built with React, TypeScript, and Tailwind CSS, featuring customizable summary lengths (Short, Medium, Detailed), formatting styles (Paragraph, Bullet Points, Key Takeaways), salient keyword extraction, and clipboard and file export capabilities.

---

## 3. INTRODUCTION
Document summarization is a critical discipline within Natural Language Processing (NLP) that aims to reduce text volume while retaining core semantic meaning and salient information. Traditional approaches rely on human readers or rudimentary keyword heuristics. With the advent of deep transformer architectures (such as BART, T5, and Large Language Models), automated summarization has reached near-human parity.

Deploying state-of-the-art transformer models in production requires resilient cloud infrastructure capable of handling computational demands, elastic scaling, secure storage, and low-latency inference. Cloud computing platforms like Amazon Web Services (AWS) provide managed machine learning services—notably Amazon SageMaker AI—alongside durable object storage through Amazon S3. 

DocuMind AI combines a modern React/TypeScript presentation layer with a high-performance Python FastAPI asynchronous backend, bridging the gap between cloud machine learning models and end-user productivity tools.

---

## 4. PROBLEM STATEMENT
Professionals, researchers, and students routinely confront information overload when processing dense multi-page documents. Specific challenges include:
1. **Inefficient Reading Times**: Reviewing 20- to 50-page documents consumes hours of valuable analytical time.
2. **Inconsistent Summary Structures**: Different workflows require varying summary depths—ranging from executive one-sentence summaries to structured bullet points or comprehensive section reviews.
3. **Format Fragmentation**: Critical documents exist across disparate formats (PDF, Word DOCX, raw TXT), requiring different parsing and extraction pipelines.
4. **Cloud Integration Complexity**: Deploying enterprise ML models to serverless or containerized environments is technically challenging, often leading to insecure credential leakage, lack of storage isolation, or brittle error handling.
5. **Cost and Accessibility Barriers**: Student and academic developers require dual-mode flexibility to demonstrate full cloud architectures without incurring prohibitive 24/7 cloud hosting charges.

---

## 5. OBJECTIVES
The primary objectives of this project are:
1. **Multi-Format Document Parsing**: Build robust extractors for text-based PDF (via PyMuPDF), Word DOCX (via python-docx), and TXT formats with size and MIME validation.
2. **Cloud ML Inference**: Integrate Amazon SageMaker AI Runtime via Boto3 to invoke state-of-the-art transformer summarization models with a configurable endpoint adapter.
3. **Long-Document Chunking**: Implement an automated sliding-window chunking and map-reduce aggregation algorithm to summarize documents exceeding standard model token context windows.
4. **Cloud Object Storage**: Store uploaded source documents and generated summaries in a private Amazon S3 bucket organized by unique UUID prefixes, ensuring IAM least-privilege compliance.
5. **Dual-Mode Operational Engine**: Provide a seamless switch between cloud AWS Mode (`APP_MODE=aws`) and an offline Demo Mode (`APP_MODE=demo`) powered by a localized extractive NLP engine.
6. **User Experience & Productivity**: Deliver a responsive SaaS web dashboard supporting customizable summary lengths, output styles, keyword extraction, instant copying, TXT export, and persistent history management.

---

## 6. EXISTING SYSTEM AND PROPOSED SYSTEM

### 6.1 Existing System
- Relies on manual document review or third-party paid commercial SaaS tools (e.g., Grammarly, generic commercial LLM web portals) that expose sensitive enterprise data to third-party vendors.
- Lack of self-hosted, private cloud storage governance (documents stored on uncontrolled public servers).
- Fixed summary lengths with zero control over structural formatting (e.g. unable to select bullet points vs. numbered takeaways).
- High operational expense with no offline or zero-cost execution modes for academic review.

### 6.2 Proposed System (DocuMind AI)
- **Self-Hosted Cloud Infrastructure**: Uses organization-controlled Amazon S3 private storage and dedicated Amazon SageMaker AI inference endpoints.
- **Parametric Summarization**: Users directly control depth (Short, Medium, Detailed) and format (Paragraph, Bullet Points, Key Takeaways).
- **Dual Operating Modes**: Fully functional offline Demo Mode guarantees zero-cost demonstration while AWS mode demonstrates production cloud engineering.
- **Privacy & Security**: Zero client credentials in frontend code, server-side MIME and file size guards, sanitized S3 metadata, and untrusted-input defense against prompt injection.

---

## 7. SYSTEM REQUIREMENTS

### 7.1 Hardware Requirements
- **Processor**: Intel Core i5 / AMD Ryzen 5 or higher (minimum 4 cores).
- **RAM**: 8 GB RAM minimum (16 GB recommended).
- **Storage**: 500 MB free disk space for local source code, dependencies, and temporary documents.
- **Network**: Broadband internet connection (required for AWS API communication).

### 7.2 Software Requirements
- **Operating System**: Windows 10/11, macOS 12+, or Ubuntu 20.04+ LTS.
- **Backend Runtime**: Python 3.10, 3.11, or 3.13.
- **Frontend Runtime**: Node.js v18+ / v20+ and npm 9+.
- **Cloud Platform**: Amazon Web Services (AWS) account with permissions for S3 and SageMaker Runtime.
- **Web Browser**: Modern ECMAScript-compliant browser (Google Chrome, Mozilla Firefox, Microsoft Edge, Safari).

---

## 8. TECHNOLOGIES USED

### Frontend
- **React 18 & TypeScript**: Component-based architecture with strong static typing.
- **Vite**: Next-generation frontend build tooling offering rapid Hot Module Replacement (HMR).
- **Tailwind CSS**: Utility-first CSS framework establishing a curated design system (clean light theme, dark navy text, violet/blue accents).
- **Lucide Icons**: Professional SVG iconography set for SaaS productivity tools.
- **Axios**: Promise-based HTTP client for REST API communication.

### Backend
- **Python 3.11+ / FastAPI**: Modern, high-performance web framework based on Starlette and Pydantic v2.
- **Uvicorn**: Lightning-fast ASGI server implementation.
- **Boto3 & Botocore**: Official AWS SDK for Python to interface with Amazon S3 and SageMaker.
- **PyMuPDF (`fitz`)**: High-performance C-based engine for PDF text parsing and scanned page detection.
- **python-docx**: Document parsing library for Microsoft Word DOCX formats.
- **pytest & pytest-asyncio**: Unit testing framework with mock AWS client integration.

### Cloud Services
- **Amazon S3**: Private cloud object storage for documents and JSON/TXT summaries.
- **Amazon SageMaker AI**: Managed machine learning service for deploying and invoking real-time inference endpoints.
- **AWS IAM**: Role-based access control enforcing least-privilege policies.
- **Amazon CloudWatch**: Diagnostic and operational logging for backend workloads.

---

## 9. ARCHITECTURE
DocuMind AI follows a clean **3-Tier Cloud Architecture**:
1. **Presentation Tier**: Single Page Application (SPA) providing an accessible drag-and-drop document upload interface, text preview drawer, parameter selection controls, and summary history dashboard.
2. **Application Tier**: FastAPI REST API providing file type validation, text extraction pipelines, chunking orchestration, and storage abstraction.
3. **Storage & AI Tier**: Amazon S3 for encrypted object persistence and Amazon SageMaker AI for transformer model execution.

*(Refer to `docs/architecture.md` for complete Mermaid sequence diagrams and high-level architectural topologies).*

---

## 10. MODULE DESCRIPTIONS

### Module 1: Document Ingestion and Validation Engine (`app/services/extractor.py`)
Validates uploaded files against supported extensions (`.pdf`, `.txt`, `.docx`) and size limits (10 MB max). Performs safe stream parsing:
- Extracts selectable digital text from PDF files using PyMuPDF.
- Flags non-selectable image-only/scanned PDFs with descriptive notices explaining OCR limitations.
- Extracts paragraphs and tabular data from DOCX files using python-docx.
- Recovers encoded text across UTF-8, Latin-1, and CP1252 encodings.
- Truncates oversized documents at a configurable 50,000-character safety threshold.

### Module 2: Extractive NLP Demo Summarizer (`app/services/demo_summarizer.py`)
Provides offline summarization without cloud dependencies:
- Sentence boundary detection and tokenization.
- Word frequency and salience calculation (filtering standard English stopwords).
- Sentence ranking using a combination of term frequency, lead-paragraph positional bias, and sentence length penalties.
- Formatting into Paragraphs, organized Bullet Points, or numbered Key Takeaways.
- Extraction of high-salience keywords and key takeaway cards.

### Module 3: SageMaker AI Orchestrator (`app/services/sagemaker_service.py`)
Manages AWS ML inference:
- Instantiates Boto3 `sagemaker-runtime` clients.
- Translates user options into model payloads for Hugging Face or JumpStart models.
- Partitions large documents into 800-word overlapping chunks.
- Submits real-time inference requests and parses response payloads.
- Translates AWS error codes into meaningful, non-leaking HTTP error responses.

### Module 4: Unified Storage Provider (`app/services/storage_service.py`)
Abstracts persistence behind a common interface (`BaseStorageService`):
- `LocalStorageService`: Persists documents, JSON metadata, and summary text files to `backend/data/` for Demo Mode.
- `S3StorageService`: Stores files under `documents/{document_id}/` and `summaries/{document_id}/` in a private S3 bucket.
- Supports document retrieval, summary retrieval, pagination/history listing, and atomic deletion.

### Module 5: REST API Controller (`app/api/routes.py`)
Exposes standardized REST endpoints with Pydantic request and response schemas, robust status codes, and restricted CORS origins.

### Module 6: Web Dashboard Interface (`frontend/src/`)
Provides a light-theme SaaS interface:
- **Dashboard**: System metrics, quick upload widget, real-time AWS connection status badge.
- **Summarize Page**: Drag-and-drop file upload, file details, text preview card, parameter selector, summarization action.
- **Results View**: Formatted summary text, key points list, keyword tags, clipboard copy with feedback, TXT download, original text toggle.
- **History View**: Searchable card list with viewing and deletion capabilities.
- **Settings View**: Cloud configuration status, limits, and step-by-step setup guide.

---

## 11. ALGORITHM AND WORKFLOW

### Extractive Summarization Algorithm (Demo Mode)
1. **Input**: Cleaned document text $T$, summary length parameter $L$, format type $F$.
2. **Tokenization**: Divide $T$ into sentences $S = \{s_1, s_2, \dots, s_n\}$ and words $W = \{w_1, w_2, \dots, w_m\}$.
3. **Stopword Filtering**: Remove stopwords $W_{stop}$ yielding meaningful terms $W_{clean}$.
4. **Term Weighting**: Compute term frequency $TF(w) = \frac{\text{count}(w)}{\max_{v} \text{count}(v)}$.
5. **Sentence Scoring**: For each sentence $s_i$, compute salience:
   $$\text{Score}(s_i) = \left( \frac{1}{|s_i|} \sum_{w \in s_i} TF(w) \right) \times \text{PosBoost}(i) \times \text{LenMult}(|s_i|)$$
6. **Selection**: Select top $K$ sentences where $K = f(L, n)$.
7. **Re-ordering & Formatting**: Re-order selected sentences in chronological sequence and format into requested style $F$.

---

## 12. AWS INTEGRATION

### Amazon S3 Bucket Architecture
- **Bucket Visibility**: 100% Private; Public Access Block enabled across all four axes.
- **Encryption**: Server-Side Encryption with Amazon S3 managed keys (`AES256`).
- **Object Schema**: Separate directories for documents and summaries indexed by UUID.
- **Metadata Protection**: Safe original filename stored strictly in object metadata.

### Amazon SageMaker Endpoint Configuration
- **Model Framework**: Hugging Face Transformers (`facebook/bart-large-cnn`).
- **Instance Type**: `ml.m5.xlarge` (General Purpose, 4 vCPU, 16 GiB RAM).
- **Inference Mode**: Real-time synchronous inference via `invoke_endpoint`.

---

## 13. TESTING

### 13.1 Unit Testing Strategy
Backend testing is implemented using `pytest` without requiring live AWS credentials:
- **`test_extractor.py`**: Tests file validation, PyMuPDF digital PDF extraction, scanned PDF detection, DOCX table extraction, TXT decoding, and oversized file rejections.
- **`test_summarizer.py`**: Tests sentence tokenization, keyword salience, Short/Medium/Detailed length targets, Bullet and Key Takeaway formatters, and prompt injection defense.
- **`test_storage.py`**: Validates the complete lifecycle of document saving, summary creation, retrieval, listing, and deletion.
- **`test_aws_services.py`**: Tests SageMaker payload builders, response parsers, chunking logic, and mock Boto3 S3 and SageMaker calls.
- **`test_api.py`**: Tests FastAPI endpoints via `TestClient` verifying HTTP status codes and response schemas.

---

## 14. RESULTS AND SCREENSHOTS CHECKLIST

The following verification checklist is prepared for final evaluation:
- [x] Backend FastAPI server running and serving API requests at `http://localhost:8000`.
- [x] Frontend React application running at `http://localhost:5173`.
- [x] Dual-mode status correctly displayed (Demo Mode active by default; AWS mode selectable).
- [x] Drag-and-drop document upload successfully accepts PDF, TXT, and DOCX.
- [x] Text preview displays extracted document content, word count, and character count.
- [x] Summary length options (Short, Medium, Detailed) produce proportionally sized summaries.
- [x] Summary format options (Paragraph, Bullet Points, Key Takeaways) apply correct visual structures.
- [x] Extracted keywords and key takeaway cards display on results page.
- [x] Copy to clipboard button provides visual confirmation toast.
- [x] Download as TXT file generates and downloads the summary file.
- [x] View original text toggle reveals the full source document.
- [x] Summary history persists records, displays summary cards, and allows deletion.
- [x] Pytest unit test suite passes 100% of test cases.

*(Place actual application screenshots here during final submission:)*
- *Figure 1: Main Dashboard with AWS Status Badge and Metrics.*
- *Figure 2: Document Upload & Text Preview Drawer.*
- *Figure 3: Summary Results Page with Key Points and Format Badges.*
- *Figure 4: Summary History Page.*
- *Figure 5: Settings Page with Cloud Configuration Status.*

---

## 15. ADVANTAGES AND LIMITATIONS

### Advantages:
1. **Dual-Mode Architectural Flexibility**: Works immediately out-of-the-box in Demo Mode without requiring cloud credentials or billing, while supporting full AWS S3 and SageMaker deployment.
2. **Multi-Format Ingestion**: Supports the three most common document types (PDF, DOCX, TXT) with robust error recovery.
3. **Enterprise Security**: Complete separation of secrets, private S3 storage, sanitized paths, and least-privilege IAM policies.
4. **High-Fidelity Summarization**: Parametric control over summary depth and visual structure.

### Limitations:
1. **Scanned PDF OCR**: Scanned documents or image-only PDFs require an external OCR engine (such as AWS Textract or Tesseract), which is intentionally excluded to avoid additional cloud costs.
2. **Single-User Scope**: Current version is designed as a standalone or workgroup tool; multi-tenant enterprise deployment requires an identity provider (e.g., AWS Cognito).
3. **Endpoint Cold Starts / Cost**: Running real-time SageMaker endpoints 24/7 incurs hourly hosting fees unless deleted after use.

---

## 16. FUTURE SCOPE
1. **AWS Textract Integration**: Add optical character recognition for scanned invoices and historical manuscripts.
2. **Multi-Language Summarization**: Incorporate multilingual transformer models (e.g. mBART, mT5).
3. **User Authentication & RBAC**: Integrate Amazon Cognito for multi-user document isolation and role-based access.
4. **SageMaker Asynchronous / Serverless Inference**: Transition from real-time endpoints to SageMaker Serverless Inference to achieve true pay-per-request pricing with zero idle cost.
5. **Interactive Document Q&A (RAG)**: Extend the platform with Amazon OpenSearch Serverless and LangChain to enable natural language question answering over ingested documents.

---

## 17. CONCLUSION
DocuMind AI successfully demonstrates a modern, full-stack, cloud-native document summarization solution. By integrating **Amazon S3** for secure object persistence and **Amazon SageMaker AI** for transformer-driven text summarization, the system addresses the critical problem of information overload. The implementation adheres strictly to software engineering best practices, including decoupled architectural design, dual-mode operational resiliency, comprehensive unit testing, and a polished user interface. The project delivers both practical utility and academic rigor, serving as an ideal blueprint for cloud machine learning application development.

---

## 18. REFERENCES
1. Lewis, M., et al. (2020). *BART: Denoising Sequence-to-Sequence Pre-training for Natural Language Generation, Translation, and Comprehension*. Association for Computational Linguistics (ACL).
2. Raffel, C., et al. (2020). *Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer*. Journal of Machine Learning Research (JMLR).
3. Amazon Web Services. *Amazon SageMaker Developer Guide*. AWS Documentation, 2024.
4. Amazon Web Services. *Amazon Simple Storage Service (S3) User Guide*. AWS Documentation, 2024.
5. Ramírez, S. *FastAPI: Modern, Fast (High-Performance) Web Framework for Building APIs with Python*. Tiangolo, 2024.
6. PyMuPDF Documentation. *PyMuPDF: Python Bindings for the MuPDF Library*. Artifex Software, 2024.
