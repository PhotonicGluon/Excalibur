from typing import Annotated

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

    from tomlkit import TOMLDocument, dump, dumps, load, loads
    from tomlkit.exceptions import ParseError
    from tomlkit.items import Item, Table

    from excalibur_server.consts import CONFIG_FILE, CONFIG_TEMPLATE_FILE

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

    # Get the template config file
    try:
        with open(CONFIG_TEMPLATE_FILE, "r") as f:
            template_config = load(f)
    except FileNotFoundError:
        typer.secho("Template config file not found!", fg="red")
        raise typer.Exit(1)

    # Helpers
    def _is_table(obj: Item) -> bool:
        return hasattr(obj, "items") and hasattr(obj, "keys")

    def _get_value_by_path(config: Table, path: str):
        keys = path.split(".")
        current = config
        for key in keys:
            if _is_table(current) and key in current:
                current = current[key]
            else:
                return None
        return current

    def _add_new_field(table: Table, key: str, value: Any, top_comment: str = "", side_comment: str = "") -> Table:
        """
        Helper method that adds a new field to a TOML table.
        """

        new_table = table.copy()
        new_table.add(key, value)
        if side_comment:
            new_table[key].comment(side_comment)

        new_table_str = f"[{table.name}]\n" + new_table.as_string()
        if top_comment:
            idx = new_table_str.find(key)
            new_table_str = new_table_str[:idx] + f"\n# {top_comment}\n" + new_table_str[idx:]

        table = loads(new_table_str)[table.name]
        return table

    def _migrate_config(src_doc: TOMLDocument, dst_doc: TOMLDocument, key_mapping: dict[str, str] | None = None):
        if key_mapping is None:
            key_mapping = {}

        def recursive_update(dst_table: Table, current_path=""):
            for key, new_value in dst_table.items():
                path = f"{current_path}.{key}" if current_path else key

                # Handle mappings of keys
                if path in key_mapping:
                    old_val = _get_value_by_path(src_doc, key_mapping[path])
                    if old_val is not None:
                        dst_table[key] = old_val
                    continue

                # Otherwise, copy over old value
                old_table = _get_value_by_path(src_doc, current_path) if current_path else src_doc
                if old_table is not None and key in old_table:
                    old_value = old_table[key]
                    if _is_table(new_value) and _is_table(old_value):
                        recursive_update(new_value, path)
                    else:
                        dst_table[key] = old_value

        recursive_update(dst_doc)
        return dst_doc

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

        return config

    def v3_to_v4(config: TOMLDocument) -> TOMLDocument:
        config["version"] = 4

        # Add new key strength field
        config["security"] = _add_new_field(
            config["security"],
            "key_strength",
            128,
            top_comment="The key strength, in bits, to use for cryptographic operations\n# Valid values: 128, 192, 256",
        )

        return config

    def v4_to_v5(config: TOMLDocument) -> TOMLDocument:
        from base64 import b64encode

        from excalibur_server.src.auth.opaque import OPAQUE_OPRF_TYPE, OPAQUEServer

        config["version"] = 5

        # Add so-called OPAQUE "sub-table" for the SRP table
        # (We do this so that the ordering of the config tables is correct)
        config["security"]["srp"]["opaque"] = {}

        # Add OPRF seed field
        opaque = OPAQUEServer(oprf_type=OPAQUE_OPRF_TYPE)
        config["security"]["srp"]["opaque"] = _add_new_field(
            config["security"]["srp"]["opaque"],
            "oprf_seed",
            opaque.generate_seed().hex(),
            top_comment="The seed for Oblivious Pseudo-Random Function (OPRF) operations, in hexadecimal "
            + "format\n# SECURITY NOTE: Keep this value secret and secure!",
        )

        # Add private and public key fields
        private_key, public_key = opaque.generate_keys(for_export=True)

        config["security"]["srp"]["opaque"] = _add_new_field(
            config["security"]["srp"]["opaque"],
            "public_key",
            b64encode(public_key).decode("utf-8"),
            top_comment="Public key for OPAQUE protocol",
        )
        config["security"]["srp"]["opaque"] = _add_new_field(
            config["security"]["srp"]["opaque"],
            "private_key",
            b64encode(private_key).decode("utf-8"),
            top_comment="Private key for OPAQUE protocol\n# SECURITY NOTE: Keep this value secret " + "and secure!",
        )

        # Now dump the config data and correct the OPAQUE table to be be its own table
        config_str = dumps(config)
        config_str = config_str.replace("[security.srp.opaque]\n", "[security.opaque]")  # Remove extra newline...
        config_str = config_str.replace("[security.e2ee]", "\n[security.e2ee]")  # ...and move it here
        config = loads(config_str)

        return config

    def v5_to_v6(config: TOMLDocument) -> TOMLDocument:
        from base64 import b64encode

        from excalibur_server.src.auth.opaque import OPAQUE_OPRF_TYPE, OPAQUEServer

        new_config = template_config.copy()
        new_config = _migrate_config(config, new_config)
        new_config["version"] = 6

        # Generate new account creation keys
        private_key, public_key = OPAQUEServer(oprf_type=OPAQUE_OPRF_TYPE).generate_keys(for_export=True)
        new_config["security"]["account_creation"]["public_key"] = b64encode(public_key).decode("utf-8")
        new_config["security"]["account_creation"]["private_key"] = b64encode(private_key).decode("utf-8")

        return new_config

    SETTINGS_VERSION = 6
    UPDATERS = {
        1: v1_to_v2,
        2: v2_to_v3,
        3: v3_to_v4,
        4: v4_to_v5,
        5: v5_to_v6,
    }

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


@config_app.command(name="generate-keys")
def generate_keys(
    validate_config: Annotated[
        bool, typer.Option("--validate-config", "-v", help="Whether to validate the config before generating keys.")
    ] = True,
    silent: Annotated[bool, typer.Option("-s", "--silent", help="Whether to silence all output.")] = False,
):
    """
    Generate keys for account creation and for the OPAQUE protocol.
    """

    from base64 import b64encode

    from tomlkit import dump, load
    from tomlkit.exceptions import ParseError

    from excalibur_server.consts import CONFIG_FILE
    from excalibur_server.src.auth.opaque import OPAQUE_OPRF_TYPE, OPAQUEServer

    if validate_config:
        # Check if the config is valid
        # (Just importing is enough to validate the config)
        try:
            from excalibur_server.src.config import CONFIG as CONFIG
        except Exception as e:
            typer.secho(f"Config is invalid: {e}", fg="red")
            raise typer.Exit(1)

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

    # Generate new keys
    if not silent:
        typer.secho("Generating new keys...", fg="yellow")

    OPAQUE = OPAQUEServer(oprf_type=OPAQUE_OPRF_TYPE)

    account_creation_private_key, account_creation_public_key = OPAQUE.generate_keys(for_export=True)
    opaque_private_key, opaque_public_key = OPAQUE.generate_keys(for_export=True)

    config["security"]["account_creation"]["private_key"] = b64encode(account_creation_private_key).decode("utf-8")
    config["security"]["account_creation"]["public_key"] = b64encode(account_creation_public_key).decode("utf-8")
    config["security"]["opaque"]["private_key"] = b64encode(opaque_private_key).decode("utf-8")
    config["security"]["opaque"]["public_key"] = b64encode(opaque_public_key).decode("utf-8")

    # Write the config
    with open(CONFIG_FILE, "w") as f:
        dump(config, f)

    if not silent:
        typer.secho("Keys (re)generated!", fg="green")
