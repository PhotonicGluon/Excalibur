from .security_details import SecurityDetails, SecurityDetailsWithVerifier


def test_security_details_serialization():
    security_details = SecurityDetails(auk_salt=b"abcd12345", srp_salt=b"qwerty67890")
    serialized = {
        "auk_salt": "YWJjZDEyMzQ1",
        "srp_salt": "cXdlcnR5Njc4OTA=",
    }

    assert security_details.model_dump() == serialized
    assert SecurityDetails.from_base64s(serialized) == security_details

    security_details_with_verifier = SecurityDetailsWithVerifier(
        auk_salt=b"abcd12345", srp_salt=b"qwerty67890", verifier=b"1234567890"
    )
    serialized = {
        "auk_salt": "YWJjZDEyMzQ1",
        "srp_salt": "cXdlcnR5Njc4OTA=",
        "verifier": "MTIzNDU2Nzg5MA==",
    }

    assert security_details_with_verifier.model_dump() == serialized
    assert SecurityDetailsWithVerifier.from_base64s(serialized) == security_details_with_verifier
