
require('ts-node').register({transpileOnly: true});
const extension = require('./extension.ts');

module.exports.activate = extension.activate;
module.exports.deactivate = extension.deactivate;
