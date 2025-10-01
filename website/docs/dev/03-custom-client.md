---
sidebar_label: Custom Client
---

# Making a Custom Client

Any Excalibur server exposes a common API for clients to connect to. The documentation for this API is available at the `/api/docs` endpoint for any Excalibur server.

## Data Flow

To communicate with an Excalibur server, the following steps should be performed.

0. Check if server is alive.
1. Check version compatibility.
2. Check if the requested user is registered on the server.
    1. If not, get the SRP group size.
    2. Then add the user on the server.
3. Authenticate.
    - The description of the authentication protocol can be found [here](/docs/dev/04-authentication.md).
    - The result of this should be a JSON Web Token (JWT) containing a **communication UUID**.
4. Get user's encrypted vault key.
    - This request _needs to be authenticated_ with the JWT and a Proof-of-Possession (PoP). Again, more details on the authentication protocol can be found at the link above.

Once this is complete, your client is free to request any other data from the server, _provided that authentication is performed_. Do note that all encrypted data will be stored in / sent as [the Excalibur Encryption Format (ExEF)](/docs/dev/06-encryption-format.md).

### Example

Here's how the official Excalibur client performs the above steps:

0. Send a `GET` request to `/api/well-known/version`.
1. Send a `GET` request to `/api/well-known/compatible` with the app's version as a query parameter.
2. Send a `HEAD` request to `/api/users/check/[USERNAME]` to check if the user is registered on the server.
    1. If `404 Not Found` is received, send a `GET` request to `/api/auth/group-size`.
    2. Then send a `POST` request to `/api/users/add` with the user's details.
3. Authenticate.
4. Send a `GET` request to `/api/users/vault/[USERNAME]`.

## Key Management

The process above requires us to (a) authenticate and (b) decrypt the user's vault key. **_It is not advisable to use the same key to do both these things_**. Use one key to authenticate (the "SRP key") and another key to unlock the vault (the "Account Unlock Key (AUK)"). Read more in the [key generation](/docs/dev/05-keygen.md) process.
