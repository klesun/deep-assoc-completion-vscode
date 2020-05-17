should automate eventually...

- update version in package.json with `npm version patch` or `npm version minor`
- run `npm i --only=production`
- remove all but `/bin/` and `/lib/tsc.js` from the `/node_modules/typescript` (maybe better create a fork for that...)
- update CHANGELOG
- run `node C:\Users\User\AppData\Roaming\npm\node_modules\vsce\out\vsce package`
- run `node C:\Users\User\AppData\Roaming\npm\node_modules\vsce\out\vsce publish`
- commit and push