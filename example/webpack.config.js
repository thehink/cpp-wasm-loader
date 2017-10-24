var path = require("path");
var webpack = require("webpack");

module.exports = {
    entry: './src/index.js',
    output: {
      filename: 'bundle.js',
      path: __dirname + '/build',
    },
    module: {
      rules: [
        {
          test: /\.cpp$/,
          use: {
            loader: 'cpp-wasm-loader',
            options: {
              path: 'build/',
            }
          }
        }
      ]
    },
    externals: {
      'fs': true,
      'path': true,
    },
  }