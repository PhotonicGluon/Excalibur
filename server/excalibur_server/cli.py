from typing import Annotated

import typer

app = typer.Typer(help="Commands relating to the API endpoint.", no_args_is_help=True)


@app.command()
def start_api_server(
    host: Annotated[str, typer.Option(help="Host for the server to listen on.")] = "0.0.0.0",
    port: Annotated[int, typer.Option(help="Port for the server to listen on.")] = 8000,
    debug: Annotated[bool, typer.Option(help="Whether to run the server in debug mode.")] = False,
):
    """
    Starts the API server.
    """

    import uvicorn

    uvicorn.run("excalibur_server.api.app:app", host=host, port=port, reload=debug)
