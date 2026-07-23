💥 Removed `include_exef_size` query parameter from the following endpoints:

- `/api/files/search`
- `/api/files/list/{path}`

The behaviour now is to always include the ExEF additional size (i.e., header and, possibly, footer) in file sizes.
