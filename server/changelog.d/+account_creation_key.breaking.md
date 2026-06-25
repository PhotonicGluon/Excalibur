💥 Uses of the account creation key (ACK) have been replaced with the server's public key. Accordingly,

- `excalibur init` will now report the mnemonic of the server's public key
- `excalibur user ack` has been removed and replaced with `excalibur config public-key`
- the ACK debug endpoint (`/api/auth/ack`) has been replaced with `/api/auth/public-key`
