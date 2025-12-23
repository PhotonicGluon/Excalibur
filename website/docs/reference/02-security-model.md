---
sidebar_label: Security Model
---

# Excalibur's Security Model

Excalibur makes the following assumptions when designing the system:

- Assume that an attacker is able to sniff and modify any transmission between client and server[^https-not-really].
- Assume that the server is able to read and modify any files on its system, and assume that all actions performed on the server are logged.
- Assume that the client is free from malware (as otherwise the files can already be ready and modified by an attacker).

[^https-not-really]: This assumption means, even if the connection is secured using HTTPS, that an attacker is able to decrypt and modify the transmission. This scenario is not unrealistic -- computers within a corporate network often need to accept the corporate proxy's certificate, which means that the corporation is able to monitor/modify transmissions.

The entire design of Excalibur revolves around these three assumptions. Our goal is to design a system that is able to store files that only the user can read and modify[^modify]. It turns out that these assumptions are almost identical to those of password managers, just that instead of storing passwords we are storing files. To that end, Excalibur arbitrarily chose to follow 1Password's design because it has a [publicly accessible whitepaper](https://1passwordstatic.com/files/security/1password-white-paper.pdf) detailing how it keeps data secure.

[^modify]: Technically the files could always be modified, but this condition is referring to the files being modified **without being detected**. That is, if the file was modified by someone other than the user, the system should be able to detect it.
