
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

const execOrFail = async (cmd) => {
    const {stdout, stderr} = await exec(cmd);
    if (stderr.trim()) {
        throw new Error('Failed to exec `' + cmd + '` - ' + stderr);
    } else {
        return stdout;
    }
};

const main = async () => {
    const params = collectParams();
    const newVersion = await execOrFail('npm version ' + params['-v'][0]);
    const date = new Date().toISOString().slice(0, 10);
    const quotedMessages = params['-m'];

    await execOrFail('git pull origin master');
    await execOrFail('npm update deep-assoc-lang-server');
    await execOrFail('npm i --only=production');

    const changelogPath = __dirname + '/../CHANGELOG.md';
    const changeLogLines = (await fs.readFile())
        .toString().split('\n');
    changeLogLines.splice(3, 0, ...[
        `## [${newVersion} - ${date}]`,
        ``,
        ...quotedMessages.map(m => '- ' + eval(m)),
        ``,
        ``,
    ]);
    await fs.writeFile(changelogPath, changeLogLines.join('\n'));

    const mainMsg = 'v' + newVersion + ' - ' + quotedMessages.splice(0, 1)[0];
    const commitCmd = 'git commit --amend -m ' + 
        JSON.stringify(mainMsg) + q
        uotedMessages.map(m => ' -m ' + m).join('');
    await execOrFail(commitCmd);

    //await execOrFail('git push origin master');
    //await execOrFail('node /c/Users/User/AppData/Roaming/npm/node_modules/vsce/out/vsce publish');
};

main()
    .then(() => process.exit(0))
    .catch(exc => {
        console.error(exc);
        process.exit(1);
    });