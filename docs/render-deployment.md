# Deploying DocuMind AI to Render (Complete Guide)

This guide provides end-to-end instructions for deploying the **DocuMind AI** document summarizer to [Render](https://render.com).

---

## 🚀 Deployment Options Overview

| Method | Best For | Services Used | Free Tier Friendly |
| :--- | :--- | :--- | :--- |
| **Option A: Render Blueprint (`render.yaml`)** | **Recommended** (1-Click setup) | 1 Web Service + 1 Static Site | ✅ Yes |
| **Option B: Manual Service Creation** | Step-by-step manual configuration | 1 Web Service + 1 Static Site | ✅ Yes |
| **Option C: Single Docker Web Service** | Unified single domain, zero CORS | 1 Web Service (Docker) | ✅ Yes |

---

## Option A: 1-Click Deploy via Render Blueprint (Recommended)

Render Blueprints use Infrastructure as Code (`render.yaml`) located in your repository root to configure both the backend and frontend automatically.

### Steps:
1. **Push your code to GitHub**:
   Ensure all files including `render.yaml` are pushed to your GitHub repository (see [Git & GitHub Setup](#git--github-setup) below).
2. **Log in to Render**:
   Open [dashboard.render.com](https://dashboard.render.com/) and sign in with your GitHub account.
3. **Deploy Blueprint**:
   - In the top right, click **New +** > **Blueprint**.
   - Connect your GitHub repository: `CC-project-atharva` (or your repository name).
   - Render will parse `render.yaml` and display the two configured services:
     - `documind-ai-backend` (FastAPI Python Web Service)
     - `documind-ai-frontend` (React Static Site)
   - Click **Apply**.
4. **Connect Frontend to Backend URL**:
   - Once the backend is provisioned, copy its public URL (e.g. `https://documind-ai-backend.onrender.com`).
   - Go to your frontend service in Render > **Environment**.
   - Verify `VITE_API_BASE_URL` is set to `https://<your-backend-name>.onrender.com/api`.
   - Trigger a redeploy of the frontend so Vite embeds the URL.

---

## Option B: Manual Service Creation on Render

If you prefer setting up the services manually via the Render Web UI:

### Step 1: Deploy FastAPI Backend (Web Service)
1. On the Render Dashboard, click **New +** > **Web Service**.
2. Select your GitHub repository.
3. Configure the following settings:
   - **Name**: `documind-ai-backend`
   - **Root Directory**: `backend`
   - **Environment / Runtime**: `Python 3`
   - **Region**: `Oregon (US West)` (or closest to you)
   - **Branch**: `main`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: `Free`
4. Add **Environment Variables**:
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `APP_MODE` | `demo` | Runs local extractive NLP with zero AWS cost |
   | `ALLOWED_ORIGINS` | `*` | Allows browser access from your frontend |
   | `PYTHON_VERSION` | `3.11.9` | Sets stable Python version |
5. Click **Create Web Service**. Wait for the build to finish and test your health endpoint:
   `https://<your-backend>.onrender.com/api/health`

---

### Step 2: Deploy React Frontend (Static Site)
1. On the Render Dashboard, click **New +** > **Static Site**.
2. Select the same GitHub repository.
3. Configure the following settings:
   - **Name**: `documind-ai-frontend`
   - **Root Directory**: `frontend`
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add **Environment Variables**:
   | Key | Value |
   | :--- | :--- |
   | `VITE_API_BASE_URL` | `https://<your-backend>.onrender.com/api` |
5. Add **Rewrite / Redirect Rule** (crucial for React SPA routing):
   - Under **Redirects/Rewrites**:
   - **Type**: `Rewrite`
   - **Source**: `/*`
   - **Destination**: `/index.html`
6. Click **Create Static Site**.

---

## Option C: Unified Single-Container Deploy (Docker)

If you only want a **single URL** that hosts both the frontend and backend with **zero CORS configuration**:

1. Click **New +** > **Web Service**.
2. Select your GitHub repo.
3. Choose **Docker** runtime.
4. Leave Root Directory empty (root of repo).
5. Add Environment Variables:
   - `APP_MODE`: `demo`
   - `ALLOWED_ORIGINS`: `*`
6. Click **Create Web Service**. Render will automatically execute the multi-stage `Dockerfile`, build the React UI, and serve both the UI and API from a single free instance!

---

## ⚙️ Switching from Demo Mode to AWS Production Mode

When you are ready to connect real Amazon S3 and Amazon SageMaker endpoints, update your backend environment variables in Render:

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `APP_MODE` | `aws` | Enables SageMaker AI and S3 integration |
| `AWS_REGION` | `us-east-1` | AWS Region where resources reside |
| `S3_BUCKET_NAME` | `documind-summaries-bucket-unique` | S3 bucket name |
| `SAGEMAKER_ENDPOINT_NAME` | `documind-summarizer-endpoint` | Live SageMaker endpoint |
| `SAGEMAKER_PAYLOAD_FORMAT` | `huggingface` | Model format (`huggingface` or `jumpstart`) |
| `AWS_ACCESS_KEY_ID` | `AKIAIOSFODNN7EXAMPLE` | IAM User access key |
| `AWS_SECRET_ACCESS_KEY` | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` | IAM User secret key |

---

## 💡 Troubleshooting & Render Free Tier Tips

1. **Free Tier Cold Starts (50-Second Spin-up)**:
   Render spins down free Web Services after 15 minutes of inactivity. When visiting the app for the first time, allow ~40-60 seconds for the backend to spin up.
2. **CORS Errors**:
   Ensure `ALLOWED_ORIGINS` on the backend includes your frontend Render URL or is set to `*`.
3. **Frontend API URL**:
   Remember that Vite environment variables (`VITE_API_BASE_URL`) are injected **at build time**. If you change your backend URL, trigger a manual **Clear build cache & deploy** on the frontend service.
