from typing import Annotated

import typer

from alembic import command

from . import CLI_DIR, get_alembic_config

ALEMBIC_DIR = CLI_DIR.parent / "alembic"

db_app = typer.Typer(no_args_is_help=True, help="Wrappers for Alembic commands.")


# Add commands
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
