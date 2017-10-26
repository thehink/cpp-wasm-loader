

const fs = require('fs');
const loaderUtils = require('loader-utils');
const path = require('path');
const shell = require('shelljs');
const {
    build,
    generateIdl
} = require('./build');

module.exports = function(source) {
    // Indicate that this loader is asynchronous
    const callback = this.async();
    const srcDir = path.dirname(this.resourcePath);

    const filename = path.basename(this.resourcePath);
    const packageName = path.basename(this.resourcePath, path.extname(this.resourcePath));

    const opts = Object.assign({
        release: false,
        wasm: true,
        asmjs: true,
        includes: [],
        config: {},
        flags: '', 
    }, loaderUtils.getOptions(this));

    const {
        release,
        wasm,
        asmjs,
        includes,
        config,
        flags,
    } = opts;

    const buildPath = opts.path;
    if (buildPath === undefined) {
        return callback(
            new Error(
                'You must set the `path` option to the path to webpack output relative to project root',
            ),
            null,
        );
    }

    const outDir = path.join(
        srcDir,
        'target',
        release ? 'release' : 'debug'
    );

    shell.mkdir('-p', outDir);

    const outFile = path.join(outDir, `${packageName}.js`);

    const buildStuff = () => {
        if (wasm) {
            build({
                path: outDir,
                output: `${packageName}.js`,
                name: packageName,
                wasm: true,
                release: true,
                glue: path.join(srcDir, `glue.js`),
                includes: includes,
                config: config,
                flags: flags,
                entries: [{
                    input: this.resourcePath,
                    additionalFlags: [
                        '-std=c++11',
                    ]
                }]
            }, (error, stdout, stderr) => {
                if (error) {
                    return callback(error, null);
                }

                const wasmFile = fs
                    .readdirSync(outDir)
                    .find(f => /\.wasm$/.test(f))
                if (!wasmFile) {
                    return callback(new Error('No wasm file found', null))
                }

                this.emitFile(
                    `${packageName}.wasm`,
                    fs.readFileSync(path.join(outDir, wasmFile))
                );

                const Module = {
                    // Path in the built project to the wasm file
                    wasmBinaryFile: `${buildPath}${packageName}.wasm`,
                    // Indicates that we are NOT running in node, despite 'require' being defined
                    ENVIRONMENT: 'WEB',
                }

                const glueContent = fs.readFileSync(outFile);

                const glue = `
                ${glueContent}

                module['exports'] = ((config) => {
                    return () => ${packageName}(config);
                })(${JSON.stringify(Module)});
            `;
                return callback(null, glue);
            });
        }
    }

    const idlPath = path.join(srcDir, `${packageName}.idl`);

    generateIdl(idlPath, () => {
        buildStuff();
    }, {
        cwd: srcDir,
    });
};