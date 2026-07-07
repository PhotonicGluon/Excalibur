💥 The OPAQUE login endpoint (`/api/auth/opaque`)'s behaviour has changed:

- It will no longer respond with `ERR: User does not exist` if the user does not exist. Instead, a fake user vector will be returned. Clients are expected to detect this and respond accordingly
- The final authentication token is now sent as an ExEF message instead of a 3-part JSON object

Please read the updated documentation for more information.
