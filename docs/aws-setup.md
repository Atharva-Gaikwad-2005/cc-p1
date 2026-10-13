# AWS Setup & Deployment Guide: DocuMind AI

This guide walks you through setting up **Amazon S3** and **Amazon SageMaker AI** to run DocuMind AI in full cloud mode (`APP_MODE=aws`).

---

## 1. Prerequisites

1. An active AWS Account.
2. AWS CLI installed and configured:
   ```bash
   aws configure
   # Enter AWS Access Key ID, Secret Access Key, Default region (e.g., us-east-1), and Output format (json)
   ```
3. Python 3.10+ installed on your development machine.

---

## 2. Amazon S3 Configuration

### Step A: Create a Private S3 Bucket
Run the following command to create a private bucket in your chosen region (e.g. `us-east-1`):

```bash
# In us-east-1:
aws s3api create-bucket \
  --bucket documind-summaries-prod-<YOUR-ACCOUNT-ID> \
  --region us-east-1

# In any other region (e.g., ap-south-1):
aws s3api create-bucket \
  --bucket documind-summaries-prod-<YOUR-ACCOUNT-ID> \
  --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1
```

### Step B: Enforce Public Access Block
Ensure no files can accidentally become public:

```bash
aws s3api put-public-access-block \
  --bucket documind-summaries-prod-<YOUR-ACCOUNT-ID> \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

### Step C: Enable Default Encryption (SSE-S3)
```bash
aws s3api put-bucket-encryption \
  --bucket documind-summaries-prod-<YOUR-ACCOUNT-ID> \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        }
      }
    ]
  }'
```

---

## 3. IAM Least-Privilege Policy

Create an IAM policy `DocuMindAppPolicy` containing only the specific permissions needed by the application:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3BucketAccess",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": "arn:aws:s3:::documind-summaries-prod-<YOUR-ACCOUNT-ID>"
    },
    {
      "Sid": "S3ObjectOperations",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::documind-summaries-prod-<YOUR-ACCOUNT-ID>/*"
    },
    {
      "Sid": "SageMakerInference",
      "Effect": "Allow",
      "Action": [
        "sagemaker:InvokeEndpoint",
        "sagemaker:DescribeEndpoint"
      ],
      "Resource": "arn:aws:sagemaker:*:*:endpoint/documind-summarizer-endpoint*"
    }
  ]
}
```

Attach this policy to your application's IAM user or EC2/ECS Execution Role.

---

## 4. Amazon SageMaker AI Model Deployment

DocuMind AI's backend is pre-configured with a standard **Hugging Face Summarization adapter** compatible with models like `facebook/bart-large-cnn` or `google/flan-t5-large`.

### Option A: Deploy via Python Script (Recommended)
You can deploy a cost-efficient real endpoint on an `ml.m5.xlarge` instance using the SageMaker Python SDK:

```python
# deploy_sagemaker_endpoint.py
import sagemaker
from sagemaker.huggingface import HuggingFaceModel

role = sagemaker.get_execution_role()  # or your SageMaker Execution IAM Role ARN

# Define Hugging Face Model configuration
hub = {
    'HF_MODEL_ID': 'facebook/bart-large-cnn',
    'HF_TASK': 'summarization'
}

huggingface_model = HuggingFaceModel(
    transformers_version='4.37.0',
    pytorch_version='2.1.0',
    py_version='py310',
    env=hub,
    role=role
)

# Deploy to real-time endpoint
predictor = huggingface_model.deploy(
    initial_instance_count=1,
    instance_type='ml.m5.xlarge',
    endpoint_name='documind-summarizer-endpoint'
)

print(f"Endpoint deployed: {predictor.endpoint_name}")
```

### Option B: Deploy via SageMaker JumpStart Console
1. Open the **Amazon SageMaker Console**.
2. Navigate to **SageMaker JumpStart** > **Models, notebooks, solutions**.
3. Search for **BART Large CNN** or **FLAN-T5**.
4. Click **Deploy**, select instance type `ml.m5.xlarge`, and name the endpoint `documind-summarizer-endpoint`.
5. Wait until status transitions to **InService**.

---

## 5. Application Configuration

In `backend/.env`, set:

```env
APP_MODE=aws
AWS_REGION=us-east-1
S3_BUCKET_NAME=documind-summaries-prod-<YOUR-ACCOUNT-ID>
SAGEMAKER_ENDPOINT_NAME=documind-summarizer-endpoint
SAGEMAKER_PAYLOAD_FORMAT=huggingface
```

Restart the FastAPI backend:
```bash
python -m uvicorn app.main:app --reload --port 8000
```

When you visit the frontend **Settings** page, the AWS status badge will display **Connected** for both S3 and SageMaker.

---

## 6. Testing AWS Integration

Test the connection without uploading large documents:
1. Open `http://localhost:8000/api/config/status` in your browser or curl:
   ```bash
   curl http://localhost:8000/api/config/status
   ```
2. Verify:
   - `app_mode`: `"aws"`
   - `s3_connected`: `true`
   - `sagemaker_connected`: `true`

---

## 7. Cost Management & Resource Teardown

> [!WARNING]
> SageMaker real-time endpoints incur hourly charges while running. To keep this project completely free or budget-conscious, delete the endpoint immediately after completing demonstrations!

### Teardown Commands:
```bash
# 1. Delete SageMaker Endpoint
aws sagemaker delete-endpoint --endpoint-name documind-summarizer-endpoint

# 2. Delete SageMaker Endpoint Configuration
aws sagemaker delete-endpoint-config --endpoint-config-name documind-summarizer-endpoint

# 3. Empty and Delete S3 Bucket (Optional)
aws s3 rm s3://documind-summaries-prod-<YOUR-ACCOUNT-ID> --recursive
aws s3api delete-bucket --bucket documind-summaries-prod-<YOUR-ACCOUNT-ID>
```

When the endpoint is deleted, simply switch `APP_MODE=demo` in `backend/.env` to continue using the application offline at zero cost.
