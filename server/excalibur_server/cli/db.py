from typing import Annotated

import typer
from alembic import command

from . import CLI_DIR, get_alembic_config

ALEMBIC_DIR = CLI_DIR.parent / "alembic"

db_app = typer.Typer(no_args_is_help=True, help="Wrappers for database-related or Alembic commands.")


# Add commands
@db_app.command()
def ui():
    """
    Starts the DuckDB UI server.
    """

    import time

    from duckdb import sql

    typer.secho("Starting...", fg="yellow")
    sql("CALL start_ui_server();")
    typer.secho("DuckUI server started on http://localhost:4213/", fg="cyan")

    try:
        while True:
            time.sleep(1)
    finally:
        typer.secho("Stopping DuckDB UI server...", fg="yellow")
        sql("CALL stop_ui_server();")
        typer.secho("DuckDB UI server stopped.", fg="green")
        raise typer.Exit(0)


@db_app.command()
def upgrade(
    revision: Annotated[str, typer.Option(help="The revision to upgrade to.")] = "head",
    sql: Annotated[bool, typer.Option(help="Whether to use SQL mode")] = False,
):
    """
    Upgrades the database to a specific revision.
    """

    alembic_cfg = get_alembic_config()
    command.upgrade(alembic_cfg, revision, sql=sql)


@db_app.command()
def downgrade(
    revision: Annotated[
        str, typer.Option(help="The revision to downgrade to. Use `base` to downgrade to the initial revision.")
    ] = "-1",
    sql: Annotated[bool, typer.Option(help="Whether to use SQL mode.")] = False,
):
    """
    Downgrades the database to a specific revision.
    """

    alembic_cfg = get_alembic_config()
    command.downgrade(alembic_cfg, revision, sql=sql)


@db_app.command()
def revision(
    message: Annotated[str, typer.Option("-m", "--message", help="The revision message.")],
    autogenerate: Annotated[bool, typer.Option(help="Add automatic migration detection.")] = True,
    sql: Annotated[bool, typer.Option(help="Don't emit SQL as migration files.")] = False,
    head: Annotated[str, typer.Option(help="Head revision to build the new revision upon as a parent.")] = "head",
    splice: Annotated[
        bool,
        typer.Option(
            help="Whether the new revision should be made into a new head of its own.\n\n"
            "Required when the given head is not itself a head.",
        ),
    ] = False,
    branch_label: Annotated[str, typer.Option(help="Specify a branch label to apply to the new revision.")] = None,
    version_path: Annotated[
        str,
        typer.Option(help="Specify a specific directory from which to locate Alembic version files."),
    ] = None,
    revision_id: Annotated[str, typer.Option(help="Specify a revision ID to apply to the new revision.")] = None,
    depends_on: Annotated[str, typer.Option(help="List of 'depends on' identifiers.")] = None,
):
    """
    Creates a new revision file.
    """

    alembic_cfg = get_alembic_config()
    command.revision(
        alembic_cfg,
        message=message,
        autogenerate=autogenerate,
        sql=sql,
        head=head,
        splice=splice,
        branch_label=branch_label,
        version_path=version_path,
        rev_id=revision_id,
        depends_on=depends_on,
    )


@db_app.command()
def current(
    verbose: Annotated[bool, typer.Option(help="Whether to output in verbose mode.")] = False,
):
    """
    Shows the current revision of the database.
    """

    alembic_cfg = get_alembic_config()
    command.current(alembic_cfg, verbose=verbose)


@db_app.command()
def migrate_files_v7():
    """
    Migrate files from the per-user directory structure to a UUID-based directory structure.

    Will be removed in a future release.
    """

    # Warn about migration
    typer.echo("This will migrate files from the per-user directory structure to a UUID-based directory structure.")
    typer.secho("Please ensure that the database revision is up-to-date.", fg=typer.colors.YELLOW)
    typer.echo("Press Enter to continue...")
    try:
        input()
    except KeyboardInterrupt:
        typer.secho("Aborted.", fg=typer.colors.YELLOW)
        return

    # Code proper
    from os import getcwd
    from os.path import splitext
    from pathlib import Path
    from tempfile import TemporaryDirectory

    from excalibur_server.src.config import CONFIG
    from excalibur_server.src.db.tables import FSItem

    vault_folder = CONFIG.storage.vault_folder

    with TemporaryDirectory(dir=getcwd()) as temp_dir:
        # Move existing users to a temporary, safe directory
        typer.secho("Moving existing users to a temporary directory...", nl=False, fg=typer.colors.YELLOW)
        temp_path = Path(temp_dir)
        for user_folder in vault_folder.iterdir():
            if not user_folder.is_dir():
                continue
            user_folder.rename(temp_path / user_folder.name)

        typer.secho("done.", nl=False, fg=typer.colors.GREEN)
        typer.secho(f" (Directory is '{temp_path}')", fg=typer.colors.CYAN)

        # Move files
        typer.secho("Migrating files...", fg=typer.colors.YELLOW)
        for user_folder in temp_path.iterdir():
            for file in user_folder.iterdir():
                if not file.is_file():
                    typer.secho(f"==> Skipped directory '{file.relative_to(temp_path)}'", fg=typer.colors.YELLOW)
                    continue

                # Old system is that the file name is the ID
                file_id, _ = splitext(file.name)

                # Get new system path
                new_path = vault_folder / FSItem(id=file_id).system_path

                # Move file
                new_path.parent.mkdir(parents=True, exist_ok=True)
                file.rename(new_path)
                typer.secho(f"==> Migrated '{file.relative_to(temp_path)}'", fg=typer.colors.YELLOW)

    typer.secho("Migration complete.", fg=typer.colors.GREEN)
