from playwright.sync_api import sync_playwright
from rich import print
from httpx2 import get
import time

WIDTH = 1280
HEIGHT = 720

print("[yellow bold underline]This assumes:[/yellow bold underline]")
print("[yellow]- the app is running on http://localhost:5173")
print("[yellow]- the server is running on http://localhost:8989")
print(
    "[yellow]- a user [underline]screenshotter[/underline] exists with password [underline]Password[/underline]"
)
print("[yellow]- the user has demo files in their vault")
print()
print("[yellow bold]Press enter to continue...[/yellow bold]")
input()

# Get the ACK for signing up
print("[cyan]Getting ACK...[/cyan]")
try:
    ack = get("http://localhost:8989/api/auth/ack?as_string=true", verify=False).text
except Exception as e:
    print(f"[red]Error getting ACK: {e}[/red]")
    print("[red]Make sure the server is running on http://localhost:8989[/red]")
    exit(1)

print("[cyan]Starting screenshotter...[/cyan]")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False, slow_mo=50)
    page = browser.new_page(
        viewport={"width": WIDTH, "height": HEIGHT},
        device_scale_factor=1.5,
        # device_scale_factor=1,
        color_scheme="dark",
    )

    def screenshot(path: str, **kwargs: dict):
        page.screenshot(path=path, **kwargs)
        print(f"[cyan]    Taken screenshot: [bold]{path}[/bold][/cyan]")

    # "Quickstart" stuff + empty explorer
    page.goto("http://localhost:5173")
    screenshot(path="screenshots/welcome.png")

    page.goto("http://localhost:5173/server-choice")
    screenshot(path="screenshots/server-choice.png")  # Disable this for trying to log in only
    page.fill("#server-input > .input-wrapper", "http://localhost:8989")
    page.click("#confirm-button")

    page.wait_for_url("http://localhost:5173/login")
    page.wait_for_timeout(500)  # To allow page to fully load
    screenshot(path="screenshots/login.png")

    page.goto("http://localhost:5173/new-user")
    screenshot(path="screenshots/sign-up.png")
    page.fill("[label='Username'] > .input-wrapper", f"new-user-{time.time_ns()}")
    page.fill("[label='Password'] > .input-wrapper", "Password")
    page.fill("[label='Confirm Password'] > .input-wrapper", "Password")
    page.evaluate(f"navigator.clipboard.writeText('{ack}')")
    page.locator("input[placeholder='Word 1']").focus()
    page.keyboard.press("ControlOrMeta+v")  # Pastes the ACK
    page.click("#ack-input ion-button")
    page.wait_for_timeout(1000)  # To allow processing to fully complete
    page.click("details summary")  # Expand out the vault key
    screenshot(
        clip={
            "x": (WIDTH - 400) // 2,
            "y": (HEIGHT - 420) // 2,
            "width": 400,
            "height": 420,
        },
        path="screenshots/vault-key-initial.png",
    )

    page.goto("http://localhost:5173/files/")
    page.wait_for_timeout(
        500
    )  # To allow page to fully load (and show that there's nothing)
    screenshot(path="screenshots/explorer-empty.png")

    # Login to existing account with demo files
    page.goto("http://localhost:5173/login")
    page.fill("[label='Username'] > .input-wrapper", "screenshotter")
    page.fill("[label='Password'] > .input-wrapper", "Password")
    page.click("#login-button")

    page.wait_for_url("http://localhost:5173/files/")
    page.wait_for_timeout(500)  # To allow page to fully load
    screenshot(path="screenshots/explorer.png")

    page.click("ion-fab-button")
    page.wait_for_timeout(500)  # To allow FAB to fully load
    screenshot(
        clip={"x": WIDTH - 73, "y": HEIGHT - 180, "width": 70, "height": 180},
        path="screenshots/fab-options.png",
    )
    page.click("ion-fab-button")  # Cancel
    page.wait_for_timeout(500)  # To allow FAB to fully load

    page.locator("ion-label", has_text="Name").click()
    page.wait_for_timeout(500)  # To allow popup to fully appear
    screenshot(
        clip={"x": 27, "y": 125, "width": 275, "height": 400},
        path="screenshots/sort-options.png",
    )
    page.reload()  # Reset page state
    page.wait_for_timeout(500)  # To allow page to fully load

    page.click("#ellipsis-button")
    page.wait_for_timeout(500)  # For ellipsis menu to fully load
    screenshot(
        clip={"x": (WIDTH - 275), "y": 50, "width": 275, "height": 184},
        path="screenshots/ellipsis-menu.png",
    )
    page.reload()  # Reset page state
    page.wait_for_timeout(500)  # To allow page to fully load

    page.click("ion-fab-button")
    page.wait_for_timeout(500)  # To allow FAB to fully load
    with page.expect_file_chooser() as fc_info:
        page.locator("button[aria-label='Upload File']").click()
    file_chooser = fc_info.value
    file_chooser.set_files(
        [
            {
                "name": f"10 MB File - {time.time_ns()}.txt",
                "mimeType": "text/plain",
                "buffer": b"A" * 1_000_000,
            },
            {
                "name": f"50 MB File - {time.time_ns()}.txt",
                "mimeType": "text/plain",
                "buffer": b"B" * 10_000_000,
            },
        ]
    )
    page.wait_for_timeout(500)  # To allow toast to load
    screenshot(
        clip={"x": 265, "y": 590, "width": 750, "height": 130},
        path="screenshots/jobs-modal-peek.png",
    )
    page.click("[aria-label='Expand Modal']")  # Expands the job modal
    page.wait_for_timeout(500)  # To allow modal to fully expand
    screenshot(
        clip={"x": 265, "y": 0, "width": 750, "height": 215},
        path="screenshots/jobs-modal-expanded.png",
    )
    page.reload()  # Reset page state
    page.wait_for_timeout(500)  # To allow page to fully load

    browser.close()

print("[green]All screenshots taken![/green]")
