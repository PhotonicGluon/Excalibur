# Excalibur-Server

An encrypted file server.

## Installation

We recommend using [`pipx`](https://pipx.pypa.io/stable/) to install the server. Run

```bash
pipx install [PATH_TO_WHEEL_FILE]
```

## Usage

Run

```bash
excalibur start
```

If using debug mode, run

```bash
excalibur start --debug
```

To disable CORS, run

```bash
excalibur start --disable-cors
```

## Development

> [!NOTE]
> These instructions are for development purposes only.

### Setup

First install [the `uv` package manager](https://docs.astral.sh/uv/). Then install dependencies by running

```bash
uv sync --dev --group test
```

Validate that everything is installed correctly by running

```bash
uv version
```

### Running the API Server

See the [usage section](#usage) above, but append `uv run` before every command.

### Linting

Run

```bash
uv run ruff check
```

To automatically fix linting errors, run

```bash
uv run ruff check --fix
```

## Changelog

This project uses [`towncrier`](https://towncrier.readthedocs.io/) to generate the changelog for each version.

You can find the changes for each version in the [`changelog`](./changelog) directory. Changes that will be made in the next release can be found in the [`changelog.d`](./changelog.d) directory.

The changelog formats are based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
