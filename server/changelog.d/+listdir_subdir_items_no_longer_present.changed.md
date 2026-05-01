🧹 Subdirectories returned by `/api/files/list/{path}` will no longer have `items` returned

- Previously, any subdirectories' `items` field would be set to `null`. Now the field is omitted entirely
