from excalibur_server.api.misc import is_debug
from excalibur_server.api.pwa import PWA_PATH

TAGS = [
    {"name": "auth", "description": "Authentication endpoints."},
    {"name": "users", "description": "User management endpoints."},
    {
        "name": "files",
        "description": "File management endpoints.\n\n"
        + "Users can use a WebSocket connection to `/api/files/listen` to listen for any changes to their folders.",
    },
    {"name": "well-known", "description": "Well-known endpoints."},
    {
        "name": "encrypted",
        "description": (
            "Encrypted endpoints.\n\n"
            + "Responses follow the Excalibur Encryption Format (ExEF). See the documentation for more information."
        ),
    },
]

if PWA_PATH.exists():
    TAGS.append(
        {"name": "pwa", "description": "Progressive Web App (PWA) endpoints."},
    )

if is_debug():
    TAGS.append(
        {"name": "debug", "description": "Endpoints that are accessible only in debug mode."},
    )
