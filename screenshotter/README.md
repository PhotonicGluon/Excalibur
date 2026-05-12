# Excalibur-Screenshotter

Helper tool to generate screenshots for the website.

## Post-Install

After installing dependencies, run:

```bash
uv run playwright install chrome
```

## Usage

First start the application and server (we use `cy:e2e` to do this for convenience):

```bash
pnpm run cy:e2e
```

Then create a user called `screenshotter` with password `Password`, and ensure they have demo files in their vault.

Finally, run the screenshotter:

```bash
uv run main.py
```
