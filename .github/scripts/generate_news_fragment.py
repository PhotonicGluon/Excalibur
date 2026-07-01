import os
import re

dep_names = os.environ.get("DEP_NAMES", "")
prev_version = os.environ.get("PREV_VERSION", "")
new_version = os.environ.get("NEW_VERSION", "")
directory = os.environ.get("DIRECTORY", "")

if "/server" in directory:
    folder = "server"
else:
    folder = "app"

if not folder:
    print(f"Could not determine folder from directory: {directory}")
    exit(0)

for dep_name in dep_names.split(","):
    dep_name = dep_name.strip()
    if not dep_name:
        continue

    processed_dep_name = re.sub(r"[^\w\s\/\-]", "", dep_name)
    processed_dep_name = processed_dep_name.replace("/", "_")

    log_file_name = f"+{processed_dep_name}.deps.md"
    log_file_path = os.path.join(folder, "changelog.d", log_file_name)

    # Ensure the target directory exists
    os.makedirs(os.path.dirname(log_file_path), exist_ok=True)

    file_mode = "a" if os.path.exists(log_file_path) else "w"

    with open(log_file_path, file_mode, encoding="utf-8", newline="\n") as f:
        if file_mode == "a":
            f.write("\n==========\n")

        prev_version = prev_version.lstrip("v")
        new_version = new_version.lstrip("v")

        f.write(f"⬆️ Updated `{dep_name}` from `{prev_version}` to `{new_version}`\n")

print(f"Successfully processed updates for: {dep_names}")
