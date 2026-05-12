from playwright.sync_api import sync_playwright
from rich import print
from httpx import get
import time

print("[yellow bold underline]This assumes:[/yellow bold underline]")
print("[yellow]- the app is running on http://localhost:5173")
print("[yellow]- the server is running on http://localhost:8989")
print("[yellow]- a user [underline]screenshotter[/underline] exists with password [underline]Password[/underline]")
print("[yellow]- the user has demo files in their vault")
print()
print("[yellow bold]Press enter to continue...[/yellow bold]")
input()

# Get the ACK for signing up
ack = get("http://localhost:8989/api/auth/ack?as_string=true").text
print("[cyan]Starting browser...[/cyan]")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False, slow_mo=50)
    page = browser.new_page(
        viewport={"width": 1280, "height": 720},
        device_scale_factor=1.5,
        color_scheme="dark",
    )

    # "Quickstart" stuff + empty explorer
    page.goto("http://localhost:5173")
    page.screenshot(path="screenshots/welcome.png")

    page.goto("http://localhost:5173/server-choice")
    page.screenshot(path="screenshots/server-choice.png")
    page.fill("#server-input > .input-wrapper", "http://localhost:8989")
    page.click("#confirm-button")

    page.wait_for_url("http://localhost:5173/login")
    page.wait_for_timeout(500)  # To allow page to fully load
    page.screenshot(path="screenshots/login.png")

    page.goto("http://localhost:5173/new-user")
    page.screenshot(path="screenshots/sign-up.png")
    page.fill("#new-username-input > .input-wrapper", f"new-user-{time.time_ns()}")
    page.fill("#new-password-input > .input-wrapper", "Password")
    page.evaluate(f"navigator.clipboard.writeText('{ack}')")
    page.locator("input[placeholder='Word 1']").focus()
    page.keyboard.press("ControlOrMeta+v")  # Pastes the ACK
    page.click("#ack-input ion-button")
    page.wait_for_timeout(1000)  # To allow processing to fully complete
    page.click("details summary")  # Expand out the vault key
    page.screenshot(clip={"x": 440, "y": 150, "width": 400, "height": 420}, path="screenshots/vault-key-initial.png")

    page.goto("http://localhost:5173/files/")
    page.wait_for_timeout(500)  # To allow page to fully load (and show that there's nothing)
    page.screenshot(path="screenshots/explorer-empty.png")

    browser.close()
