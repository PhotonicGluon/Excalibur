# Excalibur-Server

An encrypted file server.

## Installation
First install [Poetry 2.x](https://python-poetry.org/). Then install dependencies by running

```bash
poetry install
```

## Running the API Server

Run

```bash
poetry run excalibur start
```

If using debug mode, run

```bash
poetry run excalibur start --debug
```

## Development

Install the development dependencies using

```bash
poetry install --with test
```
