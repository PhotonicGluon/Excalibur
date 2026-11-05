💥 Made the file CRUD endpoints refer to items by their IDs instead of their paths.

In particular, the following endpoints were changed:

- `HEAD /api/files/check/path/{path}` → `HEAD /api/files/check/item/{item_id}`
- `POST /api/files/check/paths` → `POST /api/files/check/names`
  - This endpoint now also needs a `parent_id` in the body
- `HEAD /api/files/check/dir/{path}` → `HEAD /api/files/check/dir/{folder_id}`
- `GET /api/files/list/{path}` → `GET /api/files/list/{folder_id}`
- `POST /api/files/mkdir/{path}` → `POST /api/files/mkdir/{parent_id}`
- `POST /api/files/upload/{path}` → `POST /api/files/upload/{parent_id}/{item_details}`
  - See the encrypted names fragment for the format of `item_details`
- `GET /api/files/download/{path}` → `GET /api/files/download/{file_id}`
- `DELETE /api/files/delete/{path}` → `DELETE /api/files/delete/{item_id}`
- `POST /api/files/rename/{path}` → `POST /api/files/rename/{item_id}`
- `POST /api/files/move/{path}` → `POST /api/files/move/{item_id}`
  - `new_location` is now a folder ID
