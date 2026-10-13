import logging
import os
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api.routes import router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("documind")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Intelligent Document Summarizer using AWS S3 and Amazon SageMaker AI (with offline Demo Mode)",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware with safe wildcard credentials handling
allow_all = "*" in settings.cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all else settings.cors_origins,
    allow_credentials=not allow_all,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach API routes
app.include_router(router)

# Resolve path to compiled frontend assets
frontend_dist = os.path.abspath(
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend", "dist")
)

# Mount /assets if frontend was built (for unified full-stack deployments)
if os.path.exists(frontend_dist) and os.path.isdir(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catches unhandled exceptions and prevents leaking internal stack traces or secrets.
    """
    logger.error(f"Unhandled error processing {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred while processing your request. Please check application logs."
        },
    )


@app.on_event("startup")
async def on_startup():
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Operating Mode: {settings.APP_MODE.upper()}")
    if settings.is_aws_mode:
        logger.info(f"AWS Region: {settings.AWS_REGION}")
        logger.info(f"S3 Bucket: {settings.S3_BUCKET_NAME or 'Not configured'}")
        logger.info(f"SageMaker Endpoint: {settings.SAGEMAKER_ENDPOINT_NAME or 'Not configured'}")
    else:
        logger.info("Demo Mode Active: Extractive summarizer and local persistence enabled.")


@app.get("/")
def root():
    index_file = os.path.join(frontend_dist, "index.html")
    if os.path.exists(frontend_dist) and os.path.exists(index_file):
        return FileResponse(index_file)
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "mode": settings.APP_MODE,
        "docs": "/docs",
        "health": "/api/health",
    }


# Catch-all for SPA client routing if frontend bundle is present
if os.path.exists(frontend_dist) and os.path.isdir(frontend_dist):
    @app.get("/{full_path:path}")
    async def serve_spa_pages(full_path: str):
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("redoc") or full_path.startswith("openapi.json"):
            raise HTTPException(status_code=404, detail="Not Found")
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Page not found.")
