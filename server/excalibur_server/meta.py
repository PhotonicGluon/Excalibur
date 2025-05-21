from importlib.metadata import metadata

pkg_metadata = metadata("excalibur-server")

SUMMARY = pkg_metadata["Summary"]
VERSION = pkg_metadata["Version"]

TAGS = [
    {"name": "generic", "description": "Generic endpoints"},
    {"name": "security", "description": "Security-related endpoints"},
]
