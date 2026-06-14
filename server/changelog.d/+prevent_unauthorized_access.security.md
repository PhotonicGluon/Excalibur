🔒️ Fixed a security issue where other authenticated users are permitted to view, access, or edit other users' stuff.

In particular, the following endpoints were affected:

- **`/api/users/vault/{username}`**: any authenticated user could get another user's encrypted vault key
- **`/api/users/info/{username}`**: any authenticated user could get another user's additional info
- **`/api/users/edit-info/{username}`**: any authenticated user could edit another user's additional info

These endpoints now always refer to the currently authenticated user, regardless of the `username` parameter. For now, the `username` parameter is kept for backwards compatibility, but is silently ignored. _It, however, still needs to be provided._ This requirement will be removed in the next minor release.
