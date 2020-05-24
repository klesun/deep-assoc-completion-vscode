
const util = require('util');
const fs = require('fs').promises;
const exec = util.promisify(require('child_process').exec);

const collectParams = () => {
    const args = process.argv.slice(process.execArgv.length + 2);

    const params = {};
    for (let i = 0; i < args.length + 1; i += 2) {
        params[args[i]] = params[args[i]] || [];
        params[args[i]].push(args[i + 1]);
    }

    if (!params['-v']) {
        throw new Error('-v parameter (version: patch/minor) is mandatory');
    }
    if (!['patch', 'minor'].includes(params['-v'][0])) {
        throw new Error('-v parameter must be one of: patch/minor, but you provided: ' + params['-v'][0]);
    }
    if (!params['-m'] || !params['-m'][0].trim()) {
        throw new Error('-m parameter (at least one or more) is mandatory');
    }

    return params;
};

const execAndLog = async (cmd) => {
    const result = await exec(cmd);
    console.log('executing: ' + cmd, result);
    return result;
};

const main = async () => {
    const params = collectParams();
    const newVersionResult = await execAndLog('npm version ' + params['-v'][0]);
    const newVersion = newVersionResult.stdout.trim();
    const date = new Date().toISOString().slice(0, 10);
    const messages = params['-m'];

    const processVersion = async () => {
        await execAndLog('git pull origin master');
        await execAndLog('npm update deep-assoc-lang-server');
        // TODO: add unit tests eventually
        await execAndLog('npm i --only=production');

        const changelogPath = __dirname + '/../CHANGELOG.md';
        const changeLogLines = (await fs.readFile(changelogPath))
            .toString().split('\n');
        changeLogLines.splice(3, 0, ...[
            `## [${newVersion} - ${date}]`,
            ``,
            ...messages.map(m => '- ' + m),
            ``,
        ]);
        await fs.writeFile(changelogPath, changeLogLines.join('\n'));

        await execAndLog('git add ' + changelogPath);
        await execAndLog('git add package.json');
        await execAndLog('git add package-lock.json');

        const mainMsg = newVersion + ' - ' + messages.splice(0, 1)[0];
        const commitCmd = 'git commit --amend -m ' + 
            JSON.stringify(mainMsg) +
            messages.map(m => ' -m ' + JSON.stringify(m)).join('');
        await execAndLog(commitCmd);

        await execAndLog('git push origin master');
        await execAndLog('node /Users/User/AppData/Roaming/npm/node_modules/vsce/out/vsce publish');
    };
    
    return processVersion().catch(async exc => {
        await exec('git reset --hard HEAD~1');
        await exec('git tag -d ' + newVersion);
        return Promise.reject(exc);
    });
};

main()
    .then(() => process.exit(0))
    .catch(exc => {
        console.error(exc);
        process.exit(1);
    });