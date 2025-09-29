# Contributing to Excalibur

Excalibur is an open-source project, and we welcome contributions from the community. This document outlines the process for contributing to Excalibur.

## Developing

Excalibur's code base is daunting, but don't worry! We have a [DEVELOPMENT.md](/.github/DEVELOPMENT.md) file that will guide you through setting up Excalibur for development.

## Testing

Excalibur uses automated tests to make sure that things work as expected. The app uses a combination of [Vitest](https://vitest.dev/) to perform unit tests and [Cypress](https://www.cypress.io/) to perform component and end-to-end tests. The server uses [pytest](https://docs.pytest.org/en/stable/) to perform unit tests. Please write new tests for new code that you create.

## Submitting Changes

Please send a [pull request to Excalibur](https://github.com/PhotonicGluon/Excalibur/pull/new/main) with a clear list of what you've done (read more about [pull requests](https://help.github.com/pull-requests/)). When you create a pull request, we would love it if you include tests for your changes.

Please follow our coding conventions (below) and make sure all of your commits are atomic (one feature per commit). We also sign commits with a GPG key.

Always write a clear log message for your commits. One-line messages are fine for small changes, but bigger changes should look like this:

```bash
$ git commit -s -m "A brief summary of the commit
>
> A paragraph describing what changed and its impact."
```

## Coding Conventions

This is open source software. Consider the people who will read your code, and make it look nice for them. It's sort of like driving a car: Perhaps you love doing doughnuts when you're alone, but with passengers the goal is to make the ride as smooth as possible.

The app and server both follow some opinionated coding conventions. Please follow them when you make changes.

- The app uses [Prettier](https://prettier.io/) to enforce a consistent code style; the `prettier.config.js` describes the rules for formatting. For linting we use [ESLint](https://eslint.org/). The rules are defined in the `eslint.config.js` file.
- The server uses [`ruff`](http://docs.astral.sh/ruff/) to enforce a consistent code style and perform linting. The rules are defined in the `pyproject.toml` file under `tool.ruff`.

In addition to these, we adopt the following conventions.

- We indent using four spaces.
- We use TypeScript for the app and Python for the server.
  - Variables use `camelCase` in TypeScript and `snake_case` in Python.
  - Functions use `camelCase` in TypeScript and `snake_case` in Python.
  - Classes use `PascalCase`.
  - Constants use `SCREAMING_SNAKE_CASE`.
- File names use `snake_case`.
- Please document your code. Add (an appropriate amount of) comments and docstrings to explain what your code does.

## Credits

This `CONTRIBUTING.md` document was adapted from the [one used by OpenGovernment](https://github.com/opengovernment/opengovernment/blob/master/CONTRIBUTING.md).
