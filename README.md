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

-   `123.added.md` (issue number 123, with category `added`)
-   `+some_unique_change.changed.md` (no issue number, with category `changed`)

The list of valid categories can be found in [`towncrier.toml`](./towncrier.toml).

To generate the changelog, run

```bash
towncrier build --config towncrier.toml --dir [SUBDIR] --version [VERSION]
```

Where `[SUBDIR]` is the directory of the project you want to generate the changelog for, and `[VERSION]` is the version number.

See [Towncrier for monorepos](https://towncrier.readthedocs.io/en/stable/monorepo.html) for more information.

### Testing GitHub Actions Locally

We use [nektos' `act`](https://github.com/nektar/act) to test GitHub Actions locally.

> [!WARNING]
> Specify `--container-architecture linux/amd64` on non-AMD64 machines (e.g., Apple Silicon Macs).

Some tips:

-   If you want to speed up running act and using cached actions and container images you can enable offline mode by specifying the `--action-offline-mode` flag.
-   Some steps involve the uploading of artifacts. Specify the path of the artifact server using the `--artifact-server-path` flag (e.g., `--artifact-server-path ./dist`).
-   Consider setting up an [`act` cache server](https://github.com/sp-ricard-valverde/github-act-cache-server/tree/main) to cache package downloads and to speed up the server.
    1. Run `git clone https://github.com/sp-ricard-valverde/github-act-cache-server.git` within this root directory.
    2. Set the `ACT_CACHE_AUTH_KEY` to `foo`.
        - Windows:
            - Powershell: `$env:ACT_CACHE_AUTH_KEY="foo"`
            - Command Prompt: `set ACT_CACHE_AUTH_KEY="foo"`
        - Unix: `export ACT_CACHE_AUTH_KEY="foo"`
    3. While in `github-act-cache-server`, run `docker compose up --build -d`.
