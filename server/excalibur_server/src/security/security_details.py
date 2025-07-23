import json
from base64 import b64decode, b64encode
from pathlib import Path

from pydantic import BaseModel, field_serializer

from excalibur_server.consts import ROOT_FOLDER

SECURITY_DETAILS_FILE = ROOT_FOLDER / "security.details"


class SecurityDetails(BaseModel):
    auk_salt: bytes
    srp_salt: bytes

    @field_serializer("auk_salt", "srp_salt")
    def serialize_salts(self, a_bytes: bytes, _info) -> str:
        return b64encode(a_bytes).decode("utf-8")

    @classmethod
    def from_base64s(cls, obj: dict[str, str]) -> "SecurityDetails":
        assert "auk_salt" in obj and "srp_salt" in obj
        return SecurityDetails(auk_salt=b64decode(obj["auk_salt"]), srp_salt=b64decode(obj["srp_salt"]))


class SecurityDetailsWithVerifier(SecurityDetails):
    verifier: bytes

    @field_serializer("verifier")
    def serialize_verifier(self, a_bytes: bytes, _info) -> str:
        return b64encode(a_bytes).decode("utf-8")

    @classmethod
    def from_base64s(cls, obj: dict[str, str]) -> "SecurityDetailsWithVerifier":
        assert "verifier" in obj
        super_obj = super().from_base64s(obj)
        return SecurityDetailsWithVerifier(
            auk_salt=super_obj.auk_salt,
            srp_salt=super_obj.srp_salt,
            verifier=b64decode(obj["verifier"]),
        )


def get_security_details(security_details_file: Path = SECURITY_DETAILS_FILE) -> SecurityDetailsWithVerifier:
    """
    Reads the security details from the given file.

    :param security_details_file: The file to read from. Defaults to `SECURITY_DETAILS_FILE`
    :raises FileNotFoundError: If the file does not exist
    :return: The read security details
    """

    with open(security_details_file, "r") as f:
        return SecurityDetailsWithVerifier.from_base64s(json.loads(f.read()))


def set_security_details(
    security_details: SecurityDetailsWithVerifier, security_details_file: Path = SECURITY_DETAILS_FILE
):
    """
    Writes the given security details to the given file.

    :param security_details: The security details to write
    :param security_details_file: The file to write to. Defaults to `SECURITY_DETAILS_FILE`
    """

    with open(security_details_file, "w") as f:
        f.write(security_details.model_dump_json())
