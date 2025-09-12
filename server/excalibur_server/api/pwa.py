from pathlib import Path

from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

PWA_PATH = Path(__file__).parent.parent / "static" / "pwa"


def setup_pwa():
    """
    Sets up the Progressive Web App (PWA).
    """

    from .app import app

    @app.get("/", name="PWA Index", tags=["pwa"])
    async def index_endpoint() -> str:
        """
        Progressive Web App (PWA) index.
        """

        return FileResponse(PWA_PATH / "index.html")

    app.mount("/", StaticFiles(directory=PWA_PATH, html=True), name="pwa")
