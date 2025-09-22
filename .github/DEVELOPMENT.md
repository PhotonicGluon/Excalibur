# Helping with Excalibur's Development <!-- omit from toc -->

## Table of Contents <!-- omit from toc -->

- [App](#app)
  - [Setup for App](#setup-for-app)
  - [Running](#running)
    - [PWA](#pwa)
    - [Android](#android)
- [Server](#server)
  - [Setup for Server](#setup-for-server)
  - [Running the API Server](#running-the-api-server)
  - [Linting](#linting)
- [General](#general)
  - [Generating Changelog](#generating-changelog)
  - [Testing GitHub Actions Locally](#testing-github-actions-locally)
    - [Running `test.yml`](#running-testyml)
    - [Running `test-e2e.yml`](#running-test-e2eyml)
    - [Running `release-builds.yml`](#running-release-buildsyml)

## App

### Setup for App

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

#### PWA

Run the PWA server by running

```bash
npm run dev
```

To expose the server to other devices on the local network, you can run

```bash
npx vite --no-open --host=0.0.0.0 --port=8100
```

You can change the `host` IP to restrict access.

#### Android

> [!IMPORTANT]
> Make sure to set the `JAVA_HOME` environment variable, especially if you use Android Studio only and did _not_ install Java manually.
>
> - Windows:
>   - Powershell: `$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"`
>   - Command Prompt: `set JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"`

First, [start the app's PWA server](#pwa).

Next, start the [Excalibur Server](../server/README.md) _with CORS disabled_.

Now find your android device using

```bash
npx cap run android --list
```

Note the target ID of the device you want to run the app on.

Finally, without closing the web server, we can run

```bash
npx cap run android --target=[DEVICE_TARGET] --live-reload --no-sync --port=8100 --host=[HOST_IP]
```

> [!TIP]
> You can use split terminals to run both the web server and the android app at the same time.

Once the app starts on the device, you can access it at `http://[HOST_IP]:8100` (or `http://10.0.2.2:8000` if running on an android emulator on the same machine).

## Server

### Setup for Server

First install [the `uv` package manager](https://docs.astral.sh/uv/). Then install dependencies by running

```bash
uv sync --dev --group test
```

Validate that everything is installed correctly by running

```bash
uv version
```

### Running the API Server

See the [usage section](#usage) above, but append `uv run` before every command.

### Linting

Run

```bash
uv run ruff check
```

To automatically fix linting errors, run

```bash
uv run ruff check --fix
```

## General

### Generating Changelog

We use [`towncrier`](https://github.com/twisted/towncrier) to generate the changelog. Assuming you have [`pipx`](https://pipx.pypa.io/stable/), you can install `towncrier` using

```bash
pipx install towncrier
```

To add a news fragment:

```bash
towncrier create --config towncrier.toml --dir [SUBDIR] -c "Change details go here" [FRAGMENT_FILE]
```

Where `[FRAGMENT_FILE]` is the news fragment you want to add. For example:

- `123.added.md` (issue number 123, with category `added`)
- `+some_unique_change.changed.md` (no issue number, with category `changed`)

The list of valid categories can be found in [`towncrier.toml`](./towncrier.toml).

To generate the changelog, run

```bash
towncrier build --config towncrier.toml --dir [SUBDIR] --version [VERSION]
```

Where `[SUBDIR]` is the directory of the project you want to generate the changelog for, and `[VERSION]` is the version number.

See [Towncrier for monorepos](https://towncrier.readthedocs.io/en/stable/monorepo.html) for more information.

### Testing GitHub Actions Locally

We use [nektos' `act`](https://github.com/nektar/act) to test GitHub Actions locally.

Important:

- Specify `-P ubuntu-latest=catthehacker/ubuntu:full-latest` to use the full version of Ubuntu.
- Specify `--container-architecture linux/amd64` on non-AMD64 machines (e.g., Apple Silicon Macs).

Some tips:

- To specify the workflow(s) to run, use the `--workflows` flag (e.g., `--workflows ./.github/workflows/test.yml`)
- If you want to speed up running act and using cached actions and container images you can enable offline mode by specifying the `--action-offline-mode` flag.
- Consider setting up an [`act` cache server](https://github.com/sp-ricard-valverde/github-act-cache-server/tree/main) to cache package downloads and to speed up the server.
  1. Run `git clone https://github.com/sp-ricard-valverde/github-act-cache-server.git` within this root directory.
  2. Set the `ACT_CACHE_AUTH_KEY` to `foo`.
     - Windows:
       - Powershell: `$env:ACT_CACHE_AUTH_KEY="foo"`
       - Command Prompt: `set ACT_CACHE_AUTH_KEY="foo"`
     - Unix: `export ACT_CACHE_AUTH_KEY="foo"`
  3. While in `github-act-cache-server`, run `docker compose up --build -d`.

#### Running `test.yml`

Run

```bash
act -P ubuntu-latest=catthehacker/ubuntu:full-latest --workflows .\.github\workflows\test.yml
```

#### Running `test-e2e.yml`

We need to trigger a pull request action. Run

```bash
act pull_request -P ubuntu-latest=catthehacker/ubuntu:full-latest --workflows .\.github\workflows\test-e2e.yml
```

#### Running `release-builds.yml`

The `release-builds.yml` action requires an [Android Key Store](https://developer.android.com/studio/publish/app-signing#generate-key). Once you have one, create a `.secrets` file in the root directory of the repository. The contents of the file should be:

```ini
ANDROID_SIGNING_KEY_BASE64="Base64 string of the FULL Android Key Store file's contents"
ANDROID_SIGNING_KEY_STORE_PASSWORD="Password of the Android Key Store file"
ANDROID_SIGNING_KEY_ALIAS="Alias of the key"
ANDROID_SIGNING_KEY_PASSWORD="Password of the key"
```

Now, create an `event.json` file in the `.github` folder with the following content:

```json
{
  "ref": "refs/tags/THE_TAG_HERE",
  "ref_type": "tag"
}
```

We can now run the workflow:

```bash
act -P ubuntu-latest=catthehacker/ubuntu:full-latest --workflows ./.github/workflows/release-builds.yml --secret-file ./.secrets -e ./.github/event.json --artifact-server-path ./dist
```
