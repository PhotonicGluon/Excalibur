# Excalibur-App

An app that interacts with an encrypted file server.

## Development

> [!NOTE]
> These instructions are for development purposes only.

### Setup

First, install the correct node version using `nvm` by running

```bash
nvm install
```

> [!IMPORTANT]
> For Windows, if you are using [`nvm` for Windows](https://github.com/coreybutler/nvm-windows) run `nvm install lts` and `nvm use lts`.

Then you can install dependencies by running

```bash
npm install
```

### Running

#### Web

Run the web server by running

```bash
npx vite --no-open --host=0.0.0.0 --port=8100
```

This makes the server available on all IP addresses on the local machine at port 8100.

Change the `host` IP to restrict it.

#### Android

> [!IMPORTANT]
> Make sure to set the `JAVA_HOME` environment variable, especially if you use Android Studio only and did _not_ install Java manually.
> - Windows:
>   - Powershell: `$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"`
>   - Command Prompt: `set JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"`

First amend [`cors.py`](../server/excalibur_server/api/cors.py) in the `server` directory:

```python
ALLOW_ORIGINS = [
    "*"  # <-- To allow ALL origins
]
```

Then [start the web server](#web).

Now, without closing the web server, we can run

```bash
npx cap run android --target=[PHONE_TARGET] --live-reload --no-sync --port=8100 --host=[HOST_IP]
```

> [!TIP]
> You can use split terminals to run both the web server and the android app at the same time.

Once the app starts on the device, you can access it at `http://[HOST_IP]:8100` (or `http://10.0.2.2:8000` if running on an android emulator on the same machine).
