# /// script
# requires-python = ">=3.11"
# dependencies = ["rich"]
# ///

import os
import re
import json
import subprocess
from rich.status import Status

APP_FOLDER = "app"
APP_PACKAGE_JSON_FILES = [
    "package.json",
    "app/package.json",
    "app/packages/electron/package.json",
    "app/packages/main/package.json",
]
APP_DEP_UPDATE_COMMAND = "pnpm --recursive update"

SERVER_FOLDER = "server"
SERVER_DEP_UPDATE_COMMAND = "uv lock --upgrade"


def update_app() -> dict[str, tuple[str, str]]:
    # Get existing `package.json` contents
    package_json_contents = {}
    for package_json_file in APP_PACKAGE_JSON_FILES:
        with open(package_json_file, "r") as f:
            package_json_contents[package_json_file] = json.load(f)

    # Run the `npm-check-updates` command
    with Status("Updating application dependencies"):
        subprocess.run(
            APP_DEP_UPDATE_COMMAND,
            shell=True,
            capture_output=True,
            text=True,
            check=True,
        )

    # Get new `package.json` contents
    new_package_json_contents = {}
    for package_json_file in APP_PACKAGE_JSON_FILES:
        with open(package_json_file, "r") as f:
            new_package_json_contents[package_json_file] = json.load(f)

    # Retrieve old dependencies and determine the delta between versions
    deps_version_deltas = {}

    for package_json_file in APP_PACKAGE_JSON_FILES:
        old_contents = package_json_contents[package_json_file]
        new_contents = new_package_json_contents[package_json_file]

        for dep_group in {"dependencies", "devDependencies"}:
            old_deps = old_contents.get(dep_group, {})
            new_deps = new_contents.get(dep_group, {})

            for dep, version in old_deps.items():
                if (updated_version := new_deps.get(dep)) != version:
                    if not version[0].isdigit():
                        version = version[1:]

                    if not updated_version[0].isdigit():
                        updated_version = updated_version[1:]

                    deps_version_deltas[dep] = (version, updated_version)

    return deps_version_deltas


def update_server() -> dict[str, tuple[str, str]]:
    # Run the `uv lock` command
    with Status("Updating server dependencies"):
        output = subprocess.run(
            SERVER_DEP_UPDATE_COMMAND,
            cwd=SERVER_FOLDER,
            shell=True,
            capture_output=True,
            text=True,
            check=True,
        )
        output = output.stderr

    # Get the lines which indicate updated dependencies
    raw_updates = []
    for line in output.splitlines():
        if line.startswith("Update "):
            raw_updates.append(line.removeprefix("Update "))

    # Process the updates
    updates = {}
    for raw_update in raw_updates:
        # Format is "package_name version -> version"
        package_name, versions = raw_update.split(" ", 1)
        old_version, new_version = versions.split(" -> ")
        updates[package_name] = (
            old_version.removeprefix("v"),
            new_version.removeprefix("v"),
        )

    return updates


def main() -> None:
    # Perform updates for app and server, getting the dependencies that were updated
    app_dep_updates = update_app()
    server_dep_updates = update_server()

    # Write update logs
    for folder, dep_updates in zip([APP_FOLDER, SERVER_FOLDER], [app_dep_updates, server_dep_updates]):
        for dep_name, (old_version, new_version) in dep_updates.items():
            # Properly format dependency name
            processed_dep_name = re.sub(r"[^\w\s\/\-]", "", dep_name)
            processed_dep_name = processed_dep_name.replace("/", "_")

            # Write to log
            log_file_name = f"+{processed_dep_name}.deps.md"
            log_file = os.path.join(folder, "changelog.d", log_file_name)

            file_mode = "w"
            if os.path.exists(log_file):
                file_mode = "a"
            with open(log_file, file_mode) as f:
                if file_mode == "a":
                    f.write("\n==========\n")

                f.write(f"⬆️ Updated `{dep_name}` from `{old_version}` to `{new_version}`\n")


if __name__ == "__main__":
    main()
