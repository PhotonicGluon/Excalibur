from importlib.metadata import metadata

pkg_metadata = metadata("excalibur-server")

TITLE = "Excalibur Server"
SUMMARY = pkg_metadata["Summary"]
VERSION = pkg_metadata["Version"]
