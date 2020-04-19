
import * as fsMod from 'fs';
const fs = fsMod.promises;

const Debug = require('klesun-node-tools/src/Debug.js');

const Log = {
    info: (msg: string, data?: any) => {
        const path = __dirname + '/../out/Debug_log.txt';
        const formatted = Debug.jsExport({msg, ...(!data ? {} : data)});
        return fs.appendFile(path, formatted + ',\n');
    },
};

export default Log;