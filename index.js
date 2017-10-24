const child_process = require('child_process');
const fs = require('fs');
const loaderUtils = require('loader-utils');
const path = require('path');
const { build, generateIdl } = require('./build');

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
  }, loaderUtils.getOptions(this));

  const {
    release,
    wasm,
    asmjs,
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

  const outFile = path.join(outDir, `${packageName}.js`);

  console.log('\n=====\n', outFile);

  function buildStuff() {
    if(wasm){
        build({
            path: `./build`,
            output: `${packageName}.js`,
            name: packageName,
            wasm: true,
            release: true,
            entries: [
                {
                    input: this.resourcePath,
                    additionalFlags: [
                        '-std=c++11',
                    ]
                }
            ]
        }, (error, stdout, stderr) => {
            if(error) {
                return callback( error, null, );
            }
    
            console.log('Build succeded!', output);
            console.log(stdout);
            console.log(stderr);
        });
    }
  }

  const idlPath = path.join(srcDir, `${packageName}.idl`);

  console.log('\n=====\n', idlPath);

  generateIdl(idlPath, () => {
      buildStuff();
  }, {
      cwd: srcDir,
  });

};


  // Get the contents of the javascript 'glue' code generated by Emscripten
//   const out = fs.readFileSync(outFile, 'utf8');
  
//       // Get the contents of the wasm file generated by Emscripten
//       const wasmFile = fs
//         .readdirSync(path.join(outDir, 'deps'))
//         .find(f => /\.wasm$/.test(f))
//       if (!wasmFile) {
//         return callback(new Error('No wasm file found', null))
//       }
  
//       // Emit the wasm file
//       self.emitFile(
//         `${packageName}.wasm`,
//         fs.readFileSync(path.join(outDir, 'deps', wasmFile))
//       );
  
//       // This object is passed to the Emscripten 'glue' code
//       const Module = {
//         // Path in the built project to the wasm file
//         wasmBinaryFile: `${buildPath}${packageName}.wasm`,
//         // Indicates that we are NOT running in node, despite 'require' being defined
//         ENVIRONMENT: 'WEB',
//       }
//       const glue = `module.exports = (function(existingModule){
//         return {
//           // Returns a promise that resolves when the wasm runtime is initialized and ready for use
//           initialize: function(userDefinedModule) {
//             return new Promise((resolve, reject) => {
//               if (!userDefinedModule) {
//                 userDefinedModule = {}
//               }
//               var Module = Object.assign({}, userDefinedModule, existingModule);
//               Module['onRuntimeInitialized'] = () => resolve(Module);
//               \n${out}\n
//             });
//           }
//         }
//       })(${JSON.stringify(Module)})`;
  
//       return callback(null, glue);