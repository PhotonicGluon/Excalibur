from pydantic import BaseModel, ConfigDict, model_serializer

from excalibur_server.src.auth.elliptic.abc import BaseCurve


class CredentialRequest(BaseModel):
    blinded_message: bytes

    @model_serializer
    def serialize(self):
        return self.blinded_message


class CredentialResponse(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    evaluated_element: BaseCurve
    masking_nonce: bytes
    masked_response: bytes


class AuthRequest(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    client_nonce: bytes
    client_public_keyshare: BaseCurve

    @model_serializer
    def serialize(self):
        return self.client_nonce + self.client_public_keyshare.to_bytes()


class Envelope(BaseModel):
    envelope_nonce: bytes
    auth_tag: bytes

    @model_serializer
    def serialize(self):
        return self.envelope_nonce + self.auth_tag


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
