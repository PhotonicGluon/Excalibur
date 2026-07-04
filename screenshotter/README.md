# Excalibur-Screenshotter

Helper tool to generate screenshots for the website.

## Setting Up

Install dependencies:

```bash
uv sync
```

Then install the browser:

```bash
uv run playwright install chromium
```

## Usage

First start the application and server from the root folder:

```bash
pnpm run screenshotter
```

Then ensure that the `screenshotter` user (with password `Password`) has demo files in their vault.

Finally, run the screenshotter:

```bash
uv run main.py
```
