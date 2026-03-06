# Helping with Excalibur's Development <!-- omit from toc -->

## Table of Contents <!-- omit from toc -->

- [App](#app)
  - [Setup](#setup)
  - [Running](#running)
    - [PWA](#pwa)
    - [Android](#android)
      - [Android Studio](#android-studio)
    - [Electron](#electron)
  - [Testing](#testing)
    - [Unit Tests](#unit-tests)
    - [Component Tests](#component-tests)
    - [End-to-End Tests](#end-to-end-tests)
  - [Building](#building)
    - [PWA](#pwa-1)
    - [Android](#android-1)
    - [Electron](#electron-1)
      - [Windows](#windows)
- [Server](#server)
  - [Setup](#setup-1)
  - [Running the API Server](#running-the-api-server)
  - [Testing](#testing-1)
  - [Linting](#linting)
- [General](#general)
  - [Generating Changelog](#generating-changelog)
  - [Testing GitHub Actions Locally](#testing-github-actions-locally)
    - [Running `test.yml`](#running-testyml)
    - [Running `test-e2e.yml`](#running-test-e2eyml)
    - [Running `release-builds.yml`](#running-release-buildsyml)
      - [Running Electron Builds](#running-electron-builds)

## App

### Setup

First, install the correct node version using `nvm` by running

```bash
nvm install
```

> [!IMPORTANT]
> For Windows, if you are using [`nvm` for Windows](https://github.com/coreybutler/nvm-windows) run `nvm install lts` and `nvm use lts`.

Next, you will need to get [`pnpm`](https://pnpm.io/). Run

```bash
npm install -g pnpm@latest-10
```

Then you can install dependencies by running

```bash
pnpm install
```

### Running

#### PWA

Run the PWA server by running

```bash
pnpm run dev
```

To expose the server to other devices on the local network, you can run

```bash
pnpm run dev --no-open --host=0.0.0.0 --port=8100
```

You can change the `host` IP to restrict access.

#### Android

> [!IMPORTANT]
> Make sure to set the `ANDROID_HOME` and `JAVA_HOME` environment variables, especially if you use Android Studio only and did _not_ install Java manually.
>
> - Windows:
>   - Powershell: `$env:ANDROID_HOME="C:\Users\[USERNAME]\AppData\Local\Android\Sdk"` and `$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"`
>   - Command Prompt: `set ANDROID_HOME="C:\Users\[USERNAME]\AppData\Local\Android\Sdk"` and `set JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"`

First, [start the app's PWA server](#pwa).

Next, start the [Excalibur Server](../server/README.md) _with CORS disabled_.

Now find your android device using

```bash
pnpm exec cap run android --list
```

Note the target ID of the device you want to run the app on.

Finally, without closing the web server, we can run

```bash
pnpm exec cap run android --target=[DEVICE_TARGET] --live-reload --no-sync --port=8100 --host=[HOST_IP]
```

> [!TIP]
> You can use split terminals to run both the web server and the android app at the same time.

Once the app starts on the device, assuming that the server is using the default port `54219`, you can access it at `http://[HOST_IP]:54219` (or `http://10.0.2.2:54219` if running on an android emulator on the same machine).

##### Android Studio

> [!IMPORTANT]
> This is for developers who want to develop in Android Studio. We require Android Studio Otter | 2025.2.1 or newer.

We first need the Vite project to be built. While in the `app/packages/main` directory, run

```bash
pnpm run build
```

Then we sync the changes to Capacitor by running

```bash
pnpm run sync
```

We can now open the project in Android Studio by running

```bash
pnpm run android:open
```

while still in the `app/packages/main` directory.

> [!NOTE]
> You might need to sync the Gradle project within Android Studio.

#### Electron

> [!NOTE]
> These commands should be run in the `app/packages/electron` directory.

To run the Electron app in development mode (i.e., with a Vite server), run:

```bash
pnpm run dev
```

To preview the Electron app in production mode, run

```bash
pnpm run preview
```

### Testing

The app has several test suites that should be run.

#### Unit Tests

These will test some core operations of the application without needing to spawn a graphical interface.

Within the `app/packages/main` directory, run

```bash
pnpm run test:unit
```

#### Component Tests

These test the application's components in isolation. We use Cypress to handle these component tests.

Within the `app/packages/main` directory, run

```bash
pnpm run test:component
```

#### End-to-End Tests

These test the application's functionality in a more realistic environment, but still without needing to spawn a graphical interface. This will also interact with the Excalibur Server API.

Within the root directory, run

```bash
pnpm run test:e2e
```

If you want to interact with the Cypress interface while running these tests, you can run

```bash
pnpm run cy:e2e
```

### Building

#### PWA

> [!NOTE]
> All these commands are to be run within the `main` project.

Run

```bash
pnpm run build
```

#### Android

> [!NOTE]
> This assumes that the [PWA app](#pwa-1) has been built.
>
> All these commands are to be run within the `android` project.

You might need to first grant `gradlew` executable permissions if you are on Unix. You can do that by running

```bash
chmod +x ./gradlew
```

We can now build the app using gradle by running

```bash
./gradlew build
```

To generate an unsigned release APK, run

```bash
./gradlew assembleRelease
```

#### Electron

> [!NOTE]
> All these commands are to be run within the `electron` project.

##### Windows

Run

```bash
pnpm run build:win
```

There may be an issue where a "Cannot create symbolic link" error is thrown. Follow [the solution described here](https://github.com/electron-userland/electron-builder/issues/8149#issuecomment-2079252400) and it should work.

## Server

### Setup

First install the [`uv` package manager](https://docs.astral.sh/uv/), version `0.9.3` or higher. Then install dependencies by running

```bash
uv sync --dev --group test
```

Validate that everything is installed correctly by running

```bash
uv version
```

### Running the API Server

See the [usage section](#usage) above, but append `uv run` before every command.

### Testing

Testing is done using `pytest`. While in the `server` directory, run

```bash
uv run excalibur test
```

If you want to test a specific test file, run

```bash
uv run excalibur test [TEST_FILE]
```

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

We use [nektos' `act` version 0.2.84](https://github.com/nektar/act) to test GitHub Actions locally.

> [!WARNING]
>
> For the first time running an `act` command, you'll need to edit the `.actrc` file, removing the `--action-offline-mode` flag.
>
> It is also recommended to pull the `catthehacker/ubuntu:full-latest@sha256:25231ac9a541d4b1ff7d5957e25596465ce0c1bdc0da7927d870163c4375a4a5` image before running `act` for the first time by running
>
> ```bash
> docker pull catthehacker/ubuntu:full-latest@sha256:25231ac9a541d4b1ff7d5957e25596465ce0c1bdc0da7927d870163c4375a4a5
> ```

> [!IMPORTANT]
>
> - Specify `-P ubuntu-latest=catthehacker/ubuntu:full-latest@sha256:25231ac9a541d4b1ff7d5957e25596465ce0c1bdc0da7927d870163c4375a4a5` to use the full version of Ubuntu.
> - Specify `--container-architecture linux/amd64` on non-AMD64 machines (e.g., Apple Silicon Macs).

> [!TIP]
>
> - To specify the workflow(s) to run, use the `--workflows` flag (e.g., `--workflows ./.github/workflows/test.yml`)
> - If you are encountering `EACCES: permission denied` errors, try [removing the `act-toolcache` volume](https://github.com/nektos/act/issues/2374#issuecomment-2859056727).

#### Running `test.yml`

Run

```bash
act -P ubuntu-latest=catthehacker/ubuntu:full-latest@sha256:25231ac9a541d4b1ff7d5957e25596465ce0c1bdc0da7927d870163c4375a4a5 --workflows ./.github/workflows/test.yml
```

#### Running `test-e2e.yml`

We need to trigger a pull request action. Run

```bash
act pull_request -P ubuntu-latest=catthehacker/ubuntu:full-latest@sha256:25231ac9a541d4b1ff7d5957e25596465ce0c1bdc0da7927d870163c4375a4a5 --workflows ./.github/workflows/test-e2e.yml
```

#### Running `release-builds.yml`

The `release-builds.yml` action requires an [Android Key Store](https://developer.android.com/studio/publish/app-signing#generate-key). Once you have one, create a `.secrets` file in the root directory of the repository. The contents of the file should be:

```ini
ANDROID_SIGNING_KEY_BASE64="Base64 string of the FULL Android Key Store file's contents"
ANDROID_SIGNING_KEY_STORE_PASSWORD="Password of the Android Key Store file"
ANDROID_SIGNING_KEY_ALIAS="Alias of the key"
ANDROID_SIGNING_KEY_PASSWORD="Password of the key"
GITHUB_TOKEN="GitHub fine-grained token which has 'Read and Write access to code and workflows'"
```

Now, create an `event.json` file in the `.github` folder with the following contents:

```json
{
  "ref": "refs/tags/THE_TAG_HERE",
  "ref_type": "tag",
  "act_skip_electron_builds": true
}
```

We can now run the workflow:

```bash
act -P ubuntu-latest=catthehacker/ubuntu:full-latest@sha256:25231ac9a541d4b1ff7d5957e25596465ce0c1bdc0da7927d870163c4375a4a5 --workflows ./.github/workflows/release-builds.yml --secret-file ./.secrets -e ./.github/event.json
```

##### Running Electron Builds

We first need to enable `act` to run local Electron builds. Modify the `event.json` file:

```json
{
  // ...
  "act_skip_electron_builds": false // <-- Change to `false`
}
```

Now, you might want to test each platform's building process for the application. For such cases, we assume that the host OS is the same as the target OS, thereby allowing us to do it ['self-hosted'](https://nektosact.com/usage/runners.html#:~:text=If%20you%20want%20to%20run%20Windows%20and%20macOS%20based%20platforms%20and%20you%20are%20running%20act%20within%20that%20specific%20environment%20you%20can%20opt%20out%20of%20docker%20and%20run%20them%20directly%20on%20your%20host%20system.). In that case, you can use the following commands:

- Windows

```bash
act -P windows-latest=-self-hosted --matrix os:windows-latest --workflows ./.github/workflows/release-builds.yml --secret-file ./.secrets -e ./.github/event.json -j build-app-electron
```

- macOS

```bash
act -P macos-latest=-self-hosted --matrix os:macos-latest --workflows ./.github/workflows/release-builds.yml --secret-file ./.secrets -e ./.github/event.json -j build-app-electron
```

- Linux

```bash
act -P ubuntu-latest=catthehacker/ubuntu:full-latest@sha256:25231ac9a541d4b1ff7d5957e25596465ce0c1bdc0da7927d870163c4375a4a5 --matrix os:ubuntu-latest --workflows ./.github/workflows/release-builds.yml --secret-file ./.secrets -e ./.github/event.json -j build-app-electron
```
