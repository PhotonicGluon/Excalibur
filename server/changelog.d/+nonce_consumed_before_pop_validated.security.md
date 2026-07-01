🔒️ Fixed a security issue where the nonce in the Proof-of-Possession header is consumed before the validity of the header is checked

- This could allow an attacker to flood the server with a bunch of nonces, exhausting the nonce cache
