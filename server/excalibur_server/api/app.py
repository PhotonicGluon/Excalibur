from fastapi import FastAPI

# Define app
from .meta import TITLE, SUMMARY, VERSION

app = FastAPI(
    title=TITLE,
    summary=SUMMARY,
    version=VERSION,
    description="To access a specific version's API, use `/api/v1/...`. To access the documentation for a specific version, use `/api/v1/docs`.",
    root_path="/api",
)

# Mount other apps
from excalibur_server.api.v1.app import app as api_v1

app.mount("/v1", api_v1)


# Define other routes
@app.get("/")
def index_page():
    return "Hello World"  # TODO: Change?
