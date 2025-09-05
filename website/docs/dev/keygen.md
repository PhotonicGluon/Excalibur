# Key Generation

TODO: Add

```mermaid
flowchart TD
    P[/Password, P/]
    S[/Salt, S/]

    PBKDF[[PBKDF2 with 650,000 iterations]]

    P-->|Trim and Normalize|PBKDF
    S-->PBKDF

    PBKDF-->OK[Output Key]
```
