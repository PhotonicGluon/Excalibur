# Server Quickstart

Set up an Excalibur server for clients to connect.

## Obtaining the Server Distributable

TODO: Add

## Installing

We recommend using [`pipx`](https://pipx.pypa.io/stable/) to install the server. Run

```bash
pipx install [PATH_TO_WHEEL_FILE]
```

Check that the server is installed correctly by running

```bash
excalibur --version
```

You should see the version of the server printed to the console.

## Running

Run the following command in a terminal.

```bash
excalibur start
```

You can check if the server is running by going to [`http://localhost:8888/api/well-known/version`](http://localhost:8888/api/well-known/version). You should see a response like the following:

```json
{
    "version": "0.2.0",
    "commit": null
}
```

Congratulations! You have successfully set up an Excalibur server. Move on to the [Client Quickstart](./02-client.md) to set up a client to connect to your server.
