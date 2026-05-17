🐛 Fixed an inconsistency where uploaded files must end in `.exef` but renaming files does not enforce this

- Now, failure to provide an `.exef` extension when renaming a file will return a `417 Expectation Failed` error
