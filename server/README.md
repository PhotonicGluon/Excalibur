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

### Installation
First install [Poetry 2.x](https://python-poetry.org/). Then install dependencies by running

```bash
poetry install --with test
```

### Running the API Server

Run

```bash
poetry run excalibur start
```

If using debug mode, run

```bash
poetry run excalibur start --debug
```
