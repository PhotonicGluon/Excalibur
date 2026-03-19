from pydantic import BaseModel, ConfigDict, model_serializer

from excalibur_server.src.auth.elliptic.abc import BaseCurve


class CleartextCredentials(BaseModel):
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


class CredentialRequest(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    blinded_element: BaseCurve

    @model_serializer
    def serialize(self):
        return self.blinded_element.to_bytes()


class CredentialResponse(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    evaluated_element: BaseCurve
    masking_nonce: bytes
    masked_response: bytes

    @model_serializer
    def serialize(self):
        return self.evaluated_element.to_bytes() + self.masking_nonce + self.masked_response


class AuthRequest(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    client_nonce: bytes
    client_public_keyshare: BaseCurve

    @model_serializer
    def serialize(self):
        return self.client_nonce + self.client_public_keyshare.to_bytes()


class AuthResponse(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    server_nonce: bytes
    server_public_keyshare: BaseCurve
    server_mac: bytes

    @model_serializer
    def serialize(self):
        return self.server_nonce + self.server_public_keyshare.to_bytes() + self.server_mac


class Envelope(BaseModel):
    envelope_nonce: bytes
    auth_tag: bytes

    @model_serializer
    def serialize(self):
        return self.envelope_nonce + self.auth_tag

    @classmethod
    def deserialize(cls, data: bytes, nonce_length: int):
        return cls(envelope_nonce=data[:nonce_length], auth_tag=data[nonce_length:])


class RegistrationRecord(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    client_public_key: BaseCurve
    masking_key: bytes
    envelope: Envelope


class KE1(BaseModel):
    credential_request: CredentialRequest
    auth_request: AuthRequest

    @model_serializer
    def serialize(self):
        return self.credential_request.serialize() + self.auth_request.serialize()


class KE2(BaseModel):
    credential_response: CredentialResponse
    auth_response: AuthResponse

    @model_serializer
    def serialize(self):
        return self.credential_response.serialize() + self.auth_response.serialize()


class KE3(BaseModel):
    client_mac: bytes

    @model_serializer
    def serialize(self):
        return self.client_mac
