🔒️ Changed the behaviour of encrypted routes so that they _only_ accept encrypted payloads (i.e., `X-Encrypted` must be set to `true`)

- This prevents an attacker from 'downgrading' the encryption level of a route by replacing a legitimate encrypted payload with an attacker-controlled malicious plaintext
- This setting can only be bypassed on debug mode (via the `--debug` flag)
