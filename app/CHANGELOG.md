# App Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This project uses [_towncrier_](https://towncrier.readthedocs.io/) and the changes for the upcoming release can be found in the [`changelog.d`](./changelog.d) directory.

<!-- towncrier release notes start -->

## 0.1.3 - 2025-08-22

### 🔒 Security

- Updated transient `sha.js` dependency from `2.4.11` to `2.4.12` to address CVE-2025-9288

### ✏️ Changes

- Changed minimum supported Android version from 6.0 to 13.0
- Changed privacy screen and screen orientation handling to be more platform-dependent (instead of relying on checking if the capability is available)

### 🔧 Fixes

- Fixed issue with the app GUI going out of bounds

### ⚙️ Internal

- Changed Vite config to ignore android directory (which helps to reduce spurious page reloads)
- Updated dependencies' versions


## 0.1.2 - 2025-08-19

### ✏️ Changes

- Changed privacy screen of app to be pure black (originally is the Excalibur splash screen)


## 0.1.1 - 2025-08-18

### 🔧 Fixed

- Fixed a bug where sometimes, after full decryption, downloading file for the first time reloads the page, and attempting to download same file will give "must start with ExEF header" error


## 0.1.0 - 2025-08-14

Initial release of Excalibur app.
