💥 Changed the server to store encrypted item names instead of plaintext ones. The server no longer sees item names.

Each item now has an encrypted name (`name_enc`) and a name tag (`name_tag`), both produced by the client. The server treats them as opaque bytes. The tag is a keyed hash of the item's parent ID and name, which lets the server enforce that two items in the same folder do not share a name. As a result,

- Item IDs are now chosen by the client, since the encrypted name needs to contain the ID. The server rejects an ID that already exists with a `409`.
- `POST /api/files/mkdir/{parent_id}` now takes `{ "id", "name_enc", "name_tag" }` as its body instead of a bare name.
- `POST /api/files/upload/{parent_id}/{item_details}` replaced the file name with `item_details`, which is `id:name_enc:name_tag` (the ID in its canonical string form, and the other two as URL-safe Base64), end-to-end encrypted like the other path parameters. A malformed `item_details` is a `400`.
- `POST /api/files/rename/{item_id}` takes `{ "name_enc", "name_tag" }` as its body, and `POST /api/files/rename-multiple` maps item IDs to such objects.
- `POST /api/files/move/{item_id}` takes `{ "dest_id", "name_tag" }` as its body (previously the destination ID alone), since the tag depends on the parent. Moving a directory into itself or one of its subdirectories is now rejected with a `412`.
- `POST /api/files/check/names` takes `{ "parent_id", "name_tags" }` as its body and checks the tags.
- The server no longer rejects names with `/` or file names without `.exef`, and no longer sends a `filename` when downloading a file.
- The file and directory objects returned by the `/api/files/list`, `/api/files/all` and `/api/files/subtree` endpoints now have a `parent_id`, `name_enc` and (legacy) `name`, and no longer have a `fullpath`.
- The `/api/files/listen` websocket now sends the ID of the folder that changed (`.` for the root folder) instead of its path.
- The `name` fields of `/api/merkle/dirty` and `/api/merkle/proof` entries are now optional, and are accompanied by `name_enc`.
- Removed the `/api/files/search` endpoint, since the server can no longer search names.
