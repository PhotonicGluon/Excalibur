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

Then, once Cypress opens, select "E2E Testing", select the appropriate backend, and run the `SCREENSHOTTER_SETUP.cy.ts` test. That will create the `screenshotter` user with the password `Password`.

While keeping Cypress open, in a separate browser window, go to `http://localhost:5173/` and log in as the screenshotter user (with server URL of `http://localhost:8989`). Ensure that the `screenshotter` user has demo files in their vault.

- If a prompt for "Your vault can be upgraded to support data integrity verification." appears, click "Upgrade". Then proceed.

Finally, go to the `screenshotter` directory and run the screenshotter:

```bash
uv run main.py
```
