💥 Combined the vault key endpoint (`/api/users/vault`) and 'additional info' endpoints (`/api/users/info/{username}` and `/api/users/edit-info/{username}`) into a single vault info endpoint (`/api/users/vault`)

- This endpoint returns the account unlock key (AUK), the encrypted vault key, and the 'additional info'
- Editing the 'additional info' is done by sending a `PUT` request to that endpoint
