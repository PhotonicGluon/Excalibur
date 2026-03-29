✨ Implemented the [OPAQUE-3DH](https://datatracker.ietf.org/doc/html/rfc9807) protocol to replace the Secure Remote Password (SRP) protocol

- Added a new registration endpoint (`/api/auth/opaque/register`) to handle OPAQUE registration flows
  - This endpoint also allows existing users using SRP to upgrade to OPAQUE
- Added a new login endpoint (`/api/auth/opaque`) to handle OPAQUE login flows
