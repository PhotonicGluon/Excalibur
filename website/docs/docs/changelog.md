---
sidebar_label: Changelog
---

# Changelog

This page lists all the changes made to Excalibur.

<!-- Changelog begins below -->

## [v0.2.0](https://github.com/PhotonicGluon/Excalibur/tree/v0.2.0) - 2025-10-04

### App

#### 🔒 Security

- Added an account creation key requirement in order to sign up to the server
- Changed authentication protocol to use a Proof-of-Possession (PoP) in addition to bearer token
- Bumped `vite` from `7.1.3` to `7.1.5` to address CVE-2025-58751 and CVE-2025-58752 ([#8](https://github.com/PhotonicGluon/Excalibur/issues/8))
- Bumped `tar-fs` versions to address CVE-2025-59343 ([#12](https://github.com/PhotonicGluon/Excalibur/issues/12))

#### ✨ Additions

- Added multi-user support
- Added ability to rename files/folders
- Added a button to open the Excalibur folder to the file explorer ellipsis menu
- Added a better enrolment process
- Added a new welcome page
- Added autodetection of API server that is running on the same host
    - The app will now check for an API server on port `52419` and, if it finds one, use it as the API server URL
- Added a popup that shows the vault key when a new user is registered via the app
    - Does not show up if the user already exists on the server or is created on the server
- Added a small warning if the vault key has changed manually by the user
- Added more details to the slideover menu on the main file explorer page

#### ✏️ Changes

- Changed key generation process to include username
- Changed native file saving behaviour to better deal with errors
- Made all network fetches have a default timeout of 3 seconds
- Changed how directory items are deleted
    - Instead of swiping to reveal delete option, it is now placed in the ellipsis menu
- Changed behaviour of server URL entry to check for port `52419` if no port is specified
- Changed options for the crypto chunk size (and also made the default value 512 KiB instead of 256 KiB)
- Updated app credits

#### 🚄 Performance Improvements

- Use manual chunking in Vite build to split imported NodeJS modules into smaller chunks

#### 🔧 Fixes

- Fixed an issue where the keyboard on android devices may cover up the password field when typing
- Fixed a small inconsistency of how directories with an `.exef` suffix are displayed
    - They will now _correctly_ display the `.exef` suffix
- Fixed a misalignment of the heights of the toolbar and slideover menu on the main file explorer page

#### 📦 Dependencies

- Updated `react` and `react-dom` from `19.1.1` to `19.2.0`
- Updated `vite` from `7.1.5` to `7.1.9`, and upgraded `@vitejs/plugin-react` from `5.0.1` to `5.0.4`
- Upgraded CapacitorJS dependencies:
    - `@capacitor/app` from `7.0.2` to `7.1.0`
    - `@capacitor/keyboard` from `7.0.2` to `7.0.3`
- Upgraded Cypress from `14.5.4` to `15.3.0`
- Upgraded `@ionic/react` and `@ionic/react-router` from `8.7.3` to `8.7.5`
- Upgraded `eslint` from `9.33.0` to `9.37.0`, and upgraded `typescript-eslint` from `8.40.0` to `8.45.0`
- Upgraded `globals` from `16.3.0` to `16.4.0`
- Upgraded `tailwindcss` and `@tailwindcss/vite` from `4.1.12` to `4.1.14`
- Upgraded `typescript` from `5.9.2` to `5.9.3`
- Upgraded android dependencies:
    - AGP from `8.12.1` to `8.13.0`
    - AndroidX JUnit from `1.2.1` to `1.3.0`
    - AndroidX Espresso Core from `3.6.1` to `3.7.0`
- Upgraded various types dependencies:
    - `@types/react` from `19.1.10` to `19.2.0`
    - `@types/react-dom` from `19.1.7` to `19.2.0`

#### ⚙️ Internal

- Added more tests
- Changed the WebSocket format in the authentication protocol to use a more standardized format
- Disabled privacy screen for android builds if using a prerelease version
- Split `CHANGELOG.md` file contents into per-version changes
- Updated internal scripts

### Server

#### 🔒 Security

- Added an account creation key requirement in order to sign up to the server
- Added missing encryption in some routes
- Changed authentication protocol to use a Proof-of-Possession (PoP) in addition to bearer token

#### ✨ Additions

- Added multi-user support
- Added server-side configuration file to more easily set up and configure server
- Added the Excalibur Progressive Web App (PWA) to some server distributables
- Added an endpoint that renames a file or folder
- Added logging to files (i.e., server logs will now be written to files)
- Added a banner that appears upon running CLI commands

#### ✏️ Changes

- Changed the WebSocket format in the authentication protocol to use a more standardized format
- Changed behaviour for invalid path of directory name in the directory creation endpoint
    - It now returns `406 Not Acceptable` instead of `400 Bad Request` if the directory name is invalid
- Changed default host when starting the server to `localhost` (was `0.0.0.0`)
- Changed default port from `8888` to `52419`
- Made the warnings for 'non-standard' flags (e.g., debug mode) nicer

#### 🔧 Fixes

- Fixed a server-side issue where the encryption/decryption of chunked requests would fail on the app with a message saying "footer must be 16 bytes (got 32 bytes)"
- Fixed an issue where an equivalent endpoint was exposed at a path without the `/api` prefix
- Fixed `well-known` endpoint names

#### 📦 Dependencies

- Upgraded `cachetools` from `6.1.0` to `6.2.0`
- Upgraded `fastapi` from `0.116.1` to `0.118.0`
- Upgraded `ipython` in dev dependencies from `9.4.0` to `9.6.0`
- Upgraded `pydantic` from `2.11.7` to `2.11.9`, and upgraded `pydantic-settings` from `2.10.1` to `2.11.0`
- Upgraded `ruff` in dev dependencies from `0.12.9` to `0.13.3`
- Upgraded `sqlmodel` from `0.0.24` to `0.0.25`
- Upgraded `typer` from `0.16.1` to `0.19.2`
- Upgraded `uvicorn` from `0.35.0` to `0.37.0`

#### ⚙️ Internal

- Added a new `excalibur build` command for generating builds
- Added a lot more tests
- Added a debug endpoint for generating authentication tokens
- Sped up the `test_token_bucket.py` tests by mocking the time instead of using `time.sleep`
- Split `CHANGELOG.md` file contents into per-version changes

## [v0.1.4](https://github.com/PhotonicGluon/Excalibur/tree/v0.1.4) - 2025-09-04

### App

#### 🔒 Security

- Fixed missing encryption in some routes

#### 🚄 Performance Improvements

- Added a Comlink worker to encrypt files

#### 🔧 Fixes

- Fixed an issue where the user would not be kicked out of the session when the token expires (and the countdown shows negative time)

### Server

#### ✏️ Changes

- Changed parameters for the file upload endpoint to accept file data in the body instead of as a `multipart/form-data` request

## [v0.1.3](https://github.com/PhotonicGluon/Excalibur/tree/v0.1.3) - 2025-08-22

### App

#### 🔒 Security

- Updated transient `sha.js` dependency from `2.4.11` to `2.4.12` to address CVE-2025-9288

#### ✏️ Changes

- Changed minimum supported Android version from 6.0 to 13.0
- Changed privacy screen and screen orientation handling to be more platform-dependent (instead of relying on checking if the capability is available)

#### 🔧 Fixes

- Fixed issue with the app GUI going out of bounds

#### ⚙️ Internal

- Changed Vite config to ignore android directory (which helps to reduce spurious page reloads)
- Updated dependencies' versions

### Server

#### ⚙️ Internal

- Updated `uv.lock`'s dependencies' versions

## [v0.1.2](https://github.com/PhotonicGluon/Excalibur/tree/v0.1.2) - 2025-08-19

### App

#### ✏️ Changes

- Changed privacy screen of app to be pure black (originally is the Excalibur splash screen)

### Server

#### ⚙️ Internal

- Added `--disable-cors` option for debugging
- Changed `typer` minimum version to `0.16.1`

## [v0.1.1](https://github.com/PhotonicGluon/Excalibur/tree/v0.1.1) - 2025-08-18

### App

#### 🔧 Fixed

- Fixed a bug where sometimes, after full decryption, downloading file for the first time reloads the page, and attempting to download same file will give "must start with ExEF header" error

### Server

No significant changes.

## [v0.1.0](https://github.com/PhotonicGluon/Excalibur/tree/v0.1.0) - 2025-08-14

### App

Initial release of Excalibur app.

### Server

Initial release of Excalibur server.
