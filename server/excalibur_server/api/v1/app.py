from fastapi import FastAPI

# Define app
from excalibur_server.api.meta import TITLE, SUMMARY
from .meta import TAGS

app = FastAPI(title=TITLE, summary=SUMMARY, version="API V1", openapi_tags=TAGS)

# Include routes
from .files import router as files_router
from .security import router as security_router

app.include_router(files_router, prefix="/files")
app.include_router(security_router, prefix="/security")
