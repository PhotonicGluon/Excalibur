✨ Added a new WebSocket endpoint (`/api/auth/opaque/edit-record`) for changing the OPAQUE record of a user

- This encompasses both changing the username and password of a user
- This also allows changing of the saved key generation function on the server
  - This is just a record of _what_ key generation function was used to generate the user's keys
