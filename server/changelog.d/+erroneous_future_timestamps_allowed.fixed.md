🐛 Fixed a bug where unbounded timestamps in the future were allowed as timestamps during the Proof-of-Possession (PoP) validation process

- Now only timestamps within the configured tolerance are allowed
