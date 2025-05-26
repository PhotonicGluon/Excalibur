from base64 import b64decode, b64encode
from pathlib import Path

from pydantic import BaseModel, field_serializer

from excalibur_server.consts import FILES_FOLDER

SECURITY_DETAILS_FILE = Path(FILES_FOLDER, "security_details.json")


class SecurityDetails(BaseModel):
    # TODO: Add more
    verifier: bytes

    @field_serializer("verifier")
    def serialize_verifier(self, verifier: bytes, _info) -> str:
        return b64encode(verifier).decode("utf-8")


def get_security_details(security_details_file: Path = SECURITY_DETAILS_FILE) -> SecurityDetails:
    with open(security_details_file, "r") as f:
        details = SecurityDetails.model_validate_json(f.read())
        details.verifier = b64decode(details.verifier)
        return details


def set_security_details(security_details: SecurityDetails, security_details_file: Path = SECURITY_DETAILS_FILE):
    with open(security_details_file, "w") as f:
        f.write(security_details.model_dump_json())
