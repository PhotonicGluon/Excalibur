# Excalibur-Server

An encrypted file server.

## Installation

We recommend using [`pipx`](https://pipx.pypa.io/stable/) to install the server. Run

```bash
pipx install [PATH_TO_WHEEL_FILE]
```

## Development

> [!NOTE]
> These instructions are for development purposes only.

### Setup

First install [the `uv` package manager](https://docs.astral.sh/uv/). Then install dependencies by running

```bash
uv sync --group dev --group test
```

Validate that everything is installed correctly by running

```bash
uv version
```

### Running the API Server

Run

```bash
uv run excalibur start
```

If using debug mode, run

```bash
uv run excalibur start --debug
```

### Linting

Run

```bash
uv run ruff check
```

To automatically fix linting errors, run

```bash
uv run ruff check --fix
```
