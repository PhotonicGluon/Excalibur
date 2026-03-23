from pydantic import BaseModel, ConfigDict, model_serializer

from excalibur_server.src.auth.elliptic.abc import BaseCurve


class CleartextCredentials(BaseModel):
    """
    Cleartext credentials structure as defined in section 4.
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    server_public_key: BaseCurve
    server_identity: bytes
    client_identity: bytes

    @model_serializer
    def serialize(self):
        server_identity_len = len(self.server_identity).to_bytes(2, "big")
        client_identity_len = len(self.client_identity).to_bytes(2, "big")

        return (
            self.server_public_key.to_bytes()
            + server_identity_len
            + self.server_identity
            + client_identity_len
            + self.client_identity
        )


class Envelope(BaseModel):
    """
    Envelope structure as defined in section 4.1.1.
    """

    envelope_nonce: bytes
    auth_tag: bytes

    @model_serializer
    def serialize(self):
        return self.envelope_nonce + self.auth_tag

    @classmethod
    def deserialize(cls, data: bytes, nonce_length: int):
        return cls(envelope_nonce=data[:nonce_length], auth_tag=data[nonce_length:])


class RegistrationRequest(BaseModel):
    """
    A client registration request structure as defined in section 5.1.
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    blinded_element: BaseCurve

    @model_serializer
    def serialize(self):
        return self.blinded_element.to_bytes()


class RegistrationResponse(BaseModel):
    """
    A server registration response structure as defined in section 5.1.
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    evaluated_element: BaseCurve
    server_public_key: BaseCurve

    @model_serializer
    def serialize(self):
        return self.evaluated_element.to_bytes() + self.server_public_key.to_bytes()


class RegistrationRecord(BaseModel):
    """
    A registration record structure as defined in section 5.1.
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    client_public_key: BaseCurve
    masking_key: bytes
    envelope: Envelope

    @model_serializer
    def serialize(self):
        return self.client_public_key.to_bytes() + self.masking_key + self.envelope.serialize()


class AuthRequest(BaseModel):
    """
    A client authentication request structure as defined in section 6.1.
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    client_nonce: bytes
    client_public_keyshare: BaseCurve

    @model_serializer
    def serialize(self):
        return self.client_nonce + self.client_public_keyshare.to_bytes()


class AuthResponse(BaseModel):
    """
    A server authentication response structure as defined in section 6.1.
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    server_nonce: bytes
    server_public_keyshare: BaseCurve
    server_mac: bytes

    @model_serializer
    def serialize(self):
        return self.server_nonce + self.server_public_keyshare.to_bytes() + self.server_mac


class CredentialRequest(RegistrationRequest):
    """
    A client credential request structure as defined in section 6.3.1.
    """

    # From RFC9807, this structure is exactly the same as `RegistrationRequest`
    pass


class CredentialResponse(BaseModel):
    """
    A server credential response structure as defined in section 6.3.1.
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    evaluated_element: BaseCurve
    masking_nonce: bytes
    masked_response: bytes

    @model_serializer
    def serialize(self):
        return self.evaluated_element.to_bytes() + self.masking_nonce + self.masked_response


class KE1(BaseModel):
    """
    Key exchange message 1 structure as defined in section 6.1.
    """

    credential_request: CredentialRequest
    auth_request: AuthRequest

    @model_serializer
    def serialize(self):
        return self.credential_request.serialize() + self.auth_request.serialize()


class KE2(BaseModel):
    """
    Key exchange message 2 structure as defined in section 6.1.
    """

    credential_response: CredentialResponse
    auth_response: AuthResponse

    @model_serializer
    def serialize(self):
        return self.credential_response.serialize() + self.auth_response.serialize()


class KE3(BaseModel):
    """
    Key exchange message 3 structure as defined in section 6.1.
    """

    client_mac: bytes

    @model_serializer
    def serialize(self):
        return self.client_mac
