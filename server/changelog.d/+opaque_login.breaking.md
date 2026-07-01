💥 The OPAQUE login endpoint (`/api/auth/opaque`) will no longer respond with `ERR: User does not exist` if the user does not exist

- Instead, a fake user vector will be returned
- Clients are expected to detect this and respond accordingly
