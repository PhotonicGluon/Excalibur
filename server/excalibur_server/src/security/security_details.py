from base64 import b64decode, b64encode

from pydantic import BaseModel, field_serializer

from excalibur_server.src.users import get_user


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


def get_security_details() -> SecurityDetailsWithVerifier:
    """
    Reads the security details from the database.

    Assumes that the security details exist.

    :return: The read security details
    """

    user = get_user("security_details")
    return SecurityDetailsWithVerifier(
        auk_salt=user.auk_salt,
        srp_salt=user.srp_salt,
        verifier=user.verifier,
    )
