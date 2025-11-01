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


@config_app.command(name="update")
def update_config():
    """
    Update Excalibur config to latest version.
    """

    import tomlkit
    from tomlkit.exceptions import ParseError

    from excalibur_server.consts import CONFIG_FILE

    # Updaters
    def v1_to_v2(config: dict) -> dict:
        from Crypto.Random import get_random_bytes

        config["version"] = 2
        return config

    SETTINGS_VERSION = 2
    UPDATERS = {
        1: v1_to_v2,
    }

    # Read the config
    try:
        with open(CONFIG_FILE, "r") as f:
            config = tomlkit.load(f)
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
        tomlkit.dump(config, f)

    typer.secho("Config updated!", fg="green")
