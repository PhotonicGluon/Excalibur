from fastapi import FastAPI

# Define app
from .meta import SUMMARY, VERSION

app = FastAPI(title="Excalibur Server", summary=SUMMARY, version=VERSION)

# Include routes
from .security import router as security_router

app.include_router(security_router, prefix="/security")


# Define other routes
@app.get("/", tags=["generic"])
def index_page():
    return "Hello World"  # TODO: Change?
