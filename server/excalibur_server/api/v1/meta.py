TAGS = [
    {"name": "security", "description": "Security-related endpoints."},
    {"name": "files", "description": "File management endpoints."},
    {
        "name": "encrypted",
        "description": "Encrypted endpoints.\n\nThese endpoints will return a JSON object containing `alg` (algorithm, usually `aes-256-gcm`), `nonce` (base64-encoded nonce), `ciphertext` (base64-encoded ciphertext), and `tag` (base64-encoded tag).",
    },
]
