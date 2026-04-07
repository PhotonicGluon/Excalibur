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
        typer.Exit(0)


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
def migrate_files():
    """
    Migrate files from the old operating-system dependent system to the new database-backed system.

    Will be removed in a future release.
    """

    # Warn about migration
    typer.echo(
        "This will migrate files from the old operating-system dependent system to the new database-backed system."
    )
    typer.secho("Please ensure that the database revision is up-to-date.", fg=typer.colors.YELLOW)
    typer.echo("Press Enter to continue...")
    try:
        input()
    except KeyboardInterrupt:
        typer.secho("Aborted.", fg=typer.colors.YELLOW)
        return

    # Code proper
    import mimetypes
    from pathlib import Path

    from excalibur_server.src.config import CONFIG
    from excalibur_server.src.db.operations import add_item, get_session
    from excalibur_server.src.db.tables import FSItem, User

    vault_folder = CONFIG.storage.vault_folder

    # Get users that need to be migrated
    with get_session() as session:
        with session.begin():
            users = session.query(User).all()
            users = [user.model_copy() for user in users if user.fsitem_id is None]

    typer.echo(f"Found {len(users)} user(s) to migrate.")

    for user in users:
        user_folder = vault_folder / user.username
        typer.secho(f"==> Migrating user '{user.username}'...")

        # Create root item for user
        root_item = FSItem(parent_id=None, root_id="", name=user.username, is_folder=True)
        root_item.root_id = root_item.id
        root_id = root_item.id
        add_item(root_item)

        # Add database entries
        directories = {".": root_id}
        file_renaming_map: dict[Path, str] = {}
        for abs_path in user_folder.rglob("*"):
            path = abs_path.relative_to(user_folder)
            if abs_path.is_dir():
                # Create new FSItem for the directory
                dir_item = FSItem(
                    parent_id=directories[str(path.parent)], root_id=root_id, name=path.name, is_folder=True
                )
                directories[str(path)] = dir_item.id
                add_item(dir_item)
                continue

            # Create new FSItem for the file
            mimetype, _ = mimetypes.guess_type(abs_path.name.removesuffix(".exef"), strict=True)
            file_item = FSItem(
                parent_id=directories[str(path.parent)],
                root_id=root_id,
                name=path.name,
                is_folder=False,
                size=abs_path.stat().st_size,
                mimetype=mimetype,
            )
            file_renaming_map[abs_path] = f"{file_item.id}.exef"
            add_item(file_item)

        # Finally, update user's root FSItem ID
        with get_session() as session:
            with session.begin():
                current_user = session.query(User).filter_by(username=user.username).first()
                current_user.fsitem_id = root_id
                session.add(current_user)

        # Move files to new locations
        for old_path, new_name in file_renaming_map.items():
            old_path.rename(user_folder / new_name)  # All files are now in the user's folder

        # Delete all directories, except root
        for rel_dir_path in sorted(directories.keys(), key=lambda x: len(x.split("/")), reverse=True):
            if rel_dir_path == ".":
                continue

            (user_folder / rel_dir_path).rmdir()

    typer.secho("Migration complete.", fg=typer.colors.GREEN)
