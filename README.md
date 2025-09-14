# Excalibur

A trustless secure file management solution using military-grade encryption.

## Development

### Generating Changelog

We use [`towncrier`](https://github.com/twisted/towncrier) to generate the changelog. Assuming you have [`pipx`](https://pipx.pypa.io/stable/), you can install it using

```bash
pipx install towncrier
```

To add a news fragment:

```bash
towncrier create --config towncrier.toml --dir [SUBDIR] -c "Change details go here" [FRAGMENT_FILE]
```

Where `[FRAGMENT_FILE]` is the news fragment you want to add. For example:

- `123.added.md` (issue number 123, with category `added`)
- `+some_unique_change.changed.md` (no issue number, with category `changed`)

The list of valid categories can be found in [`towncrier.toml`](./towncrier.toml).

To generate the changelog, run

```bash
towncrier build --config towncrier.toml --dir [SUBDIR] --version [VERSION]
```

Where `[SUBDIR]` is the directory of the project you want to generate the changelog for, and `[VERSION]` is the version number.

See [Towncrier for monorepos](https://towncrier.readthedocs.io/en/stable/monorepo.html) for more information.

### Testing GitHub Actions Locally

To test GitHub Actions locally, you can use [`act`](https://github.com/nektar/act).

If you want to speed up running act and using cached actions and container images you can enable offline mode by specifying the `--action-offline-mode` flag.

Some steps involve the uploading of artifacts. Specify the path of the artifact server using the `--artifact-server-path` flag:

```bash
act --artifact-server-path ./dist
```

> [!WARNING]
> It is recommended to specify `--container-architecture linux/amd64` on non-AMD64 machines (e.g., Apple Silicon Macs).
