# Excalibur-Server

An encrypted file server.

## Prerequisites

You will require Python 3.11+ installed on your system to run the Excalibur server.

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

### Development

To run the server in debug mode for development, run

```bash
excalibur start --debug
```

To disable CORS validation, run

```bash
excalibur start --disable-cors-validation
```

> [!CAUTION]
> Do **not** enable debug mode for production servers as sensitive endpoints are exposed that can be exploited by malicious actors.
>
> _Only enable debug mode for development servers_.

## Changelog

This project uses [`towncrier`](https://towncrier.readthedocs.io/) to generate the changelog for each version.

You can find the changes for each version in the [`changelog`](./changelog) directory. Changes that will be made in the next release can be found in the [`changelog.d`](./changelog.d) directory.

The changelog formats are based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
