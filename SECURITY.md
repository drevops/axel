# Security policy

This page explains how to report a security vulnerability in Analytics Context Layer.

## Supported versions

Security fixes go into the latest release only. Upgrade to the [latest release](https://github.com/drevops/analytics-context-layer/releases/latest) before you report an issue.

## Report a vulnerability

Email the details to [alex@drevops.com](mailto:alex@drevops.com). Report the vulnerability privately: a public issue exposes it before a fix ships.

Include these details in your report:

- The bundle and release you use, such as `acl.gtm.min.js` from `0.1.0`.
- The markup and steps that reproduce the issue.
- What an attacker gains, such as personal data in an event.

A field event that carries what a visitor typed or chose counts as a vulnerability. See [Privacy](README.md#privacy) for what the library promises.
