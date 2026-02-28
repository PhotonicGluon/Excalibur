---
title: Files
---

# Working With Files

Once a user is authenticated with the server, they can access their own files. The file operations available to them can be accessed by looking at the server's API documentation at `/api/docs`, under the "Files" category.

## Listening for Folder Updates

We need a way for the client to know when a folder has been updated so that it can refresh its local view. A client can listen for these changes by making a WebSocket connection to `/api/files/listen`.

### Connecting

Like with all operations, this request needs to be authenticated. Provide the following values _as query parameters_ in the WebSocket request:

- `auth_token`: The JWT authentication token obtained during initial authentication with the server.
- `hmac_validation`: The proof-of-possession (PoP) token computed according to the [WebSocket PoP token generation process](../authentication.md#proof-of-possession-pop).

There is an optional query parameter, `encrypted`, describing whether the WebSocket messages should be encrypted. It is recommended to _not_ set this to `false` (it is set to `true` by default).

### Listening

Once connected, the client should listen for any messages from the server. A message from the server describes the path of the folder that was updated, relative to the user's root directory. Here are some examples.

- If the subfolder `sub` was updated, the message `sub` will be sent to the user.
- If the subfolder `sub/sub2` was updated, the message `sub/sub2` will be sent to the user.
- If the root folder was updated, the message `.` will be sent to the user.

If `encrypted` is `true`, messages will be sent in the Excalibur Encryption Format (ExEF). Do remember to decrypt the messages using the [SRP master key](../authentication.md).

:::note

Any messages sent from the client will be ignored.

:::

Remember to close the WebSocket connection when the user logs out or disconnects.
