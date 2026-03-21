# OPAQUE Protocol

## Commands

Create `test-user-opaque`:

```sh
excalibur user add --username test-user-opaque --password Password --vault-key g7uMn17DkmWI3PBtxmiCLnQf34nXuEfpgexHUNBMOW0= --auth-protocol=OPAQUE-3DH
```

## Process Diagrams

### Registration

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server

    C->>S: request + username
    Note right of S: Check username
    S->>C: [OK] response
    C->>S: record + auk_salt + key_enc
    Note right of S: Save record
    S->>C: [OK]
```

### Login

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server

    C->>S: KE1 + username
    Note right of S: Check username
    S->>C: KE2
    C->>S: KE3
    Note right of S: ServerFinish(ke3)
    Note over C,S: Expand(session_key, b"Master Key", 32)
    activate S
    S->>-C: Authentication token
```
