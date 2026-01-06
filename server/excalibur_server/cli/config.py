import typer

config_app = typer.Typer(no_args_is_help=True, help="Commands relating to configuration.")


@config_app.command(name="validate")
def validate_config():
    """
    Validate Excalibur config.
    """

    # Just importing is enough to validate the config
    from excalibur_server.src.config import CONFIG as CONFIG

    typer.secho("Config is valid!", fg="green")


# ruff: noqa: C901
@config_app.command(name="update")
def update_config():
    """
    Update Excalibur config to latest version.
    """

    from typing import Any

    from tomlkit import TOMLDocument, dump, load, loads
    from tomlkit.exceptions import ParseError
    from tomlkit.items import Table

    from excalibur_server.consts import CONFIG_FILE

    # Helpers
    def _add_new_field(table: Table, key: str, value: Any, top_comment: str = "", side_comment: str = "") -> Table:
        """
        Helper method that adds a new field to a TOML table.
        """

        new_table = table.copy()
        new_table.add(key, value)
        if side_comment:
            new_table[key].comment(side_comment)

        new_table_str = new_table.as_string()
        if top_comment:
            idx = new_table_str.find(key)
            new_table_str = f"[{table.name}]\n" + new_table_str[:idx] + f"\n# {top_comment}\n" + new_table_str[idx:]

        table = loads(new_table_str)[table.name]
        return table

    # Updaters
    def v1_to_v2(config: TOMLDocument) -> TOMLDocument:
        from Crypto.Random import get_random_bytes

        config["version"] = 2

        # Add the new account creation key
        config["security"]["account_creation_key"] = get_random_bytes(32).hex()

        # Update rate limit if current values are below new defaults
        if config["server"]["rate_limit"]["capacity"] < 250:
            config["server"]["rate_limit"]["capacity"] = 250
        if config["server"]["rate_limit"]["refill_rate"] < 25:
            config["server"]["rate_limit"]["refill_rate"] = 25

        # Add new `max_log_age` field
        config["logging"] = _add_new_field(
            config["logging"],
            "max_log_age",
            720,
            top_comment="How long log files are kept before being deleted, in hours",
            side_comment="30 days",
        )

        return config

    def v2_to_v3(config: TOMLDocument) -> TOMLDocument:
        config["version"] = 3

        # Add new `consecutive_transmission_delay` field
        config["server"] = _add_new_field(
            config["server"],
            "consecutive_transmission_delay",
            100,
            top_comment="The delay between consecutive file update transmissions, in milliseconds",
        )

        # Add new cache file fields
        config["security"]["e2ee"] = _add_new_field(
            config["security"]["e2ee"],
            "comm_cache_file",
            "e2ee_sessions.cache",
            top_comment="File storing end-to-end encryption communication sessions",
        )
        config["security"]["pop"] = _add_new_field(
            config["security"]["pop"],
            "nonce_cache_file",
            "pop_nonces.cache",
            top_comment="File storing PoP nonces",
        )

        return config

    SETTINGS_VERSION = 3
    UPDATERS = {
        1: v1_to_v2,
        2: v2_to_v3,
    }

    # Read the config
    try:
        with open(CONFIG_FILE, "r") as f:
            config = load(f)
    except FileNotFoundError:
        typer.secho("Config file not found!", fg="red")
        raise typer.Exit(1)
    except ParseError as e:
        typer.secho(f"Config file is invalid: {e}", fg="red")
        raise typer.Exit(1)

    # Determine what updaters to run
    curr_version = config["version"]
    if curr_version > SETTINGS_VERSION:
        typer.secho("Config version is too new!", fg="red")
        raise typer.Exit(1)
    if curr_version == SETTINGS_VERSION:
        typer.secho("Config is already up to date!", fg="yellow")
        raise typer.Exit(0)

    # Run the updaters
    for i in range(curr_version, SETTINGS_VERSION):
        config = UPDATERS[i](config)

    # Write the config
    with open(CONFIG_FILE, "w") as f:
        dump(config, f)

    typer.secho("Config updated!", fg="green")
