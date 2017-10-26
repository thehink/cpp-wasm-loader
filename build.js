const { spawn, exec, execSync } = require('child_process');
const path = require('path');
const merge = require('lodash/merge');

const emscripten = process.env.EMSCRIPTEN;

const WEB_IDL = `${emscripten}/tools/webidl_binder.py`;
const EMCC = `${emscripten}/em++.py`;

const flags = [
    '-O3',
    '--llvm-lto 1',
    '--memory-init-file 0',
    //'-msse2',
];

const includes = [];

const defaultConfig = {
    default: {
        NO_EXIT_RUNTIME: true,
        NO_FILESYSTEM: true,
        EXPORTED_RUNTIME_METHODS: [],
        MODULARIZE: true,
        NO_DYNAMIC_EXECUTION: true,
        TOTAL_MEMORY: 64*1024*1024,
        INLINING_LIMIT: false,
        DOUBLE_MODE: false,
        PRECISE_I64_MATH: false,
        EXPORT_NAME: 'Untitled',
    },
    debug: {

    },
    release: {

    },
    wasm: {
        WASM: true,
        BINARYEN_IGNORE_IMPLICIT_TRAPS: true,
        BINARYEN_TRAP_MODE: 'allow',
    },
    asm: {
        AGGRESSIVE_VARIABLE_ELIMINATION: 1,
        ELIMINATE_DUPLICATE_FUNCTIONS: 1,
    }
};

// const config = [
//     'NO_EXIT_RUNTIME=1',
//     'NO_FILESYSTEM=1',
//     'EXPORTED_RUNTIME_METHODS=[]',
//     'MODULARIZE=1',
//     'NO_DYNAMIC_EXECUTION=1',
//     //'ALLOW_MEMORY_GROWTH=1',
//     `TOTAL_MEMORY=${64*1024*1024}`,
//     'INLINING_LIMIT=0',
//     'DOUBLE_MODE=0',
//     'PRECISE_I64_MATH=0',
// ];

// if(debug){
//     output = `${nameL}.debug.js`;
    
//     config.push(
//         'DEMANGLE_SUPPORT=1',
//         'ASSERTIONS=1',
//         'SAFE_HEAP=1'
//     );

//     flags.push(
//         //'-Werror',
//         //'--js-opts 0',
//         //'-g4'
//     );
// }

function generateIdl(filename, callback, config) {
    const ls = spawn('python', [WEB_IDL, filename, 'glue'], config);
    ls.on('close', (code) => {
        callback(code);
    });
}

function getValue(value) {
    if(typeof value === 'boolean'){
        return value ? '1' : '0';
    }

    if(typeof value === 'object'){
        return JSON.stringify(value);
    }

    if(typeof value === 'string'){
        return `\\"${value}\\"`;
    }

    return value;
}

function compileConfig() {
    const args = [];

    const newConfig = {};

    Array.from(arguments).filter(item => Boolean(item)).forEach(conf => merge(newConfig, conf));

    Object.keys(newConfig).forEach(key => {
        args.push(`-s ${key}=${getValue(newConfig[key])}`);
    });

    return args;
}

function buildC(input, flags, output, callback) {
    
        let inputs = input instanceof Array ? input : [ input ];
    
        var finalFlags = [
            ...inputs,
            ...flags,
            `-o ${output}`,
        ];
    
        console.log(new Array(40).fill(0).map(e => '=').join(''));
        console.log(finalFlags.join(' '));
        console.log(new Array(40).fill(0).map(e => '=').join(''));
    
        exec(`emcc ${finalFlags.join(' ')}`, callback);
    }
    
function build(config, callback) {
    let entries = config.entries;
    let entriesCount = entries.length;

    let output = `${config.path}/${config.output}`;

    console.log('=====OUTPUT====');
    console.log(output);

    let count = 0;

    let outfiles = [];

    const configs = [
        defaultConfig.default, 
        config.wasm ? defaultConfig.wasm : defaultConfig.default,
        config.config,
        {
            EXPORT_NAME: config.name,
        }
    ];

    const useFlags = [
        ...flags,
        ...compileConfig(...configs),
    ];
    
    config.includes.forEach(include => {
        useFlags.push(`-I ${include}`);
    });

    entries.forEach(entry => {

        let infile = entry.input;

        console.log('=========');
        console.log(entry.input);

        let filename = path.basename(entry.input, path.extname(entry.input));
        let outfile = `${config.path}/${filename}.bc`;

        outfiles.push(outfile);

        buildC(infile, [...useFlags, ...config.flags, '-c'], outfile, (error, stdout, stderr) => {
            if(error){
                return callback(error, stdout, stderr);
            }

            console.log('built', outfile);
            console.log(stdout);
            console.log(stderr);
            
            if(++count === entriesCount){
                buildC(outfiles, [...useFlags, ...config.flags, `--post-js ${config.glue}`], output, callback);
            }
        });
    });
}

module.exports = {
    build,
    generateIdl,
};