---
sidebar_label: Attestations
---

# Attestations

Excalibur's release assets are all generated using [GitHub Actions](https://github.com/features/actions). By doing so, we can leverage the use of [artefact attestations](https://docs.github.com/en/actions/concepts/security/artifact-attestations), making the provenance of the assets of Excalibur unfalsifiable and verifiable.

## Verifying Assets

:::important

You will need to install the [GitHub CLI](https://cli.github.com/).

You will also need to set up the GitHub CLI by running `gh auth login`.

:::

Suppose you downloaded a file from one of the releases. You can verify its provenance using the `gh attestations verify` command as follows:

```bash
gh attestation verify <FILE> --repo PhotonicGluon/Excalibur
```

If the verification process was successful, you should see a `Verification succeeded!` message appear in the terminal.

## All Attestations

You can find Excalibur's attestations [here](https://github.com/PhotonicGluon/Excalibur/attestations).
