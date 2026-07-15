🐛 Fixed the database engine not being disposed after use

- This leaked the DuckDB file lock and caused an IO error when a worker/reload subprocess tried to access the database
