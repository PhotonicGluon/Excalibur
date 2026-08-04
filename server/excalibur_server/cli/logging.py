from pathlib import Path
from typing import Annotated

import typer

logging_app = typer.Typer(no_args_is_help=True, help="Commands relating to logs.")


@logging_app.command(name="cleanup")
def cleanup_logs(
    log_dir: Annotated[
        Path | None,
        typer.Argument(
            help="The directory containing the logs to clean up.", exists=True, file_okay=False, dir_okay=True
        ),
    ] = None,
):
    """
    Clean up old log files.
    """

    _cleanup_logs(log_dir)


def _cleanup_logs(log_dir: Path | None = None):
    import time

    from excalibur_server.src.config import CONFIG

    if not log_dir:
        log_dir = CONFIG.logging.directory

    typer.secho(
        f"Cleaning up log files in '{log_dir}' that are older than {CONFIG.logging.max_log_age} hours.", fg="cyan"
    )

    now = int(time.time())
    num_removed = 0
    for file in log_dir.iterdir():
        log_name = file.name
        log_timestamp = log_name.removesuffix(".log")
        if not log_timestamp.isdigit():
            continue

        log_timestamp = int(log_timestamp)
        if now - log_timestamp > CONFIG.logging.max_log_age * 3600:  # Convert from hours to seconds
            file.unlink()
            typer.secho(f"    Removed {file.name}", fg="yellow")
            num_removed += 1

    typer.secho(f"Removed {num_removed} old log files.", fg="green")
