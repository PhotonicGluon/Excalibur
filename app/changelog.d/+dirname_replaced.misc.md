🔧🚨 Replaced `__dirname` with `import.meta.url`-related calls to acquiesce to Vite

- This stops the nuisance warning that the Vite configuration "uses features that are unsupported by `configLoader: 'native'`"
