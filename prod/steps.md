should automate eventually...

- update version in package.json with `npm version patch` or `npm version minor`
- run `npm update deep-assoc-lang-server`
- run `npm i --only=production`
- update CHANGELOG
- commit and push
- run `node /c/Users/User/AppData/Roaming/npm/node_modules/vsce/out/vsce publish`