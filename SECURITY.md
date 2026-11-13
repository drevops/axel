# Security policy

This page explains how to report a security vulnerability in Axel and how to check that a bundle came from this repository.

## Supported versions

Security fixes go into the latest release only. Upgrade to the [latest release](https://github.com/drevops/axel/releases/latest) before you report an issue.

## Report a vulnerability

Report the vulnerability privately: a public issue exposes it before a fix ships. Use 1 of these channels:

- Open a report from the **Security** tab of the repository: click **Report a vulnerability**.
- Email the details to [alex@drevops.com](mailto:alex@drevops.com).

Include these details in your report:

- The bundle and release you use, such as `axel.gtm.min.js` from `0.1.0`.
- The markup and steps that reproduce the issue.
- What an attacker gains, such as personal data in an event.

A field event that carries what a visitor typed or chose counts as a vulnerability. See [Privacy](README.md#privacy) for what the library promises.

You get a reply within 3 business days. After the report is confirmed, the fix ships in a new release and the report is published as a security advisory that credits you, unless you ask to stay anonymous.

## Verify a bundle

Every release attaches the bundles and a `checksums.txt` file, and its notes list the Subresource Integrity hash of each bundle. Releases after `0.1.1` also attach `axel.intoto.jsonl`, the provenance attestation for every bundle.

To check that a bundle was built from this repository by the release workflow, run the GitHub CLI:

```bash
gh attestation verify axel.gtm.min.js --repo drevops/axel --signer-workflow drevops/axel/.github/workflows/release-nodejs.yml
```

The command checks the attestation through GitHub's attestation API, which covers every release. To check against the release's own `axel.intoto.jsonl` instead, add `--bundle axel.intoto.jsonl` to the command.

To check a downloaded bundle against the release checksums, run this command in the folder that holds both files:

```bash
grep ' axel.gtm.min.js$' checksums.txt | sha256sum --check
```

The command prints `axel.gtm.min.js: OK` for a matching bundle. It fails when the bundle differs or `checksums.txt` lists no bundle by that name.
