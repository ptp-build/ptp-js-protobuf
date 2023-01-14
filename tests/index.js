'use strict';

var path = require('path'),
    cli  = require(path.join(__dirname, '..', 'cli', 'index.js'));
const protobuf = require("protobufjs/minimal");

exports.TestCase = /** @class */ (function () {
    function TestCase(name, protofiles,root,bundlesName) {
        this._case = name;
        if(root){
            this._case = root;
        }
        if(!bundlesName){
            bundlesName = name
        }
        this._root = root;
        this._protofiles = protofiles;
        this._case && (this._workdir = path.join(__dirname, name));
        this._outCppDir = '';
        if(root){
            this._outDir =  path.join(__dirname, name, "gen","js")
        }
        this._case && (this._bundlesName = bundlesName);
    }

    // configurate with local installed library
    // kind = ['full'(default)|'light'|'minimal']
    TestCase.prototype.loadLibrary = function (kind) {
        // protobuf library
        var dirname = (kind === 'full' || !kind) ? '' : kind;
        var protobuf = require(path.join(__dirname, '..', 'node_modules', 'protobufjs', 'dist', dirname, 'protobuf.js'));
        global.protobuf = global.$protobuf = protobuf;
        // for 'Long' implement
        if (!protobuf.util.Long) {
            protobuf.util.Long = require(path.join(__dirname, '..', 'node_modules', 'long'));
            protobuf.configure();
        }
        return protobuf;
    }

    TestCase.prototype.generate = function(options) {
        var args = [ '--root', "default", '--out', this._outDir, '--name', this._bundlesName, '--path', this._workdir ];
        if (options) {
            // replace options
            while (options.length) {
                if (options[0][0] === '-') {
                    var opt = options.splice(0, 1)[0];
                    var optIndex = args.indexOf(opt);
                    if (options[0] && options[0][0] !== '-') {
                        if (optIndex < 0) {
                            args.push(opt);
                            args.push(options.splice(0, 1)[0]);
                        } else {
                            args[optIndex + 1] = options.splice(0, 1)[0];
                        }
                    } else {
                        optIndex < 0 && args.push(opt);
                    }
                }
            }
        }
        if(this._protofiles.length > 0){
            args = args.concat(this._protofiles);
        }
        return cli.main(args);
    }

    TestCase.prototype.requireBundles = function() {
        require(path.join(this._outDir, this._bundlesName));
        return protobuf.util.global[this._case]
    }

    TestCase.prototype.unrequireBundles = function() {
        delete require.cache[path.join(this._outDir, this._bundlesName) + '.js'];
        delete global.protobuf.roots[this._case];
        delete global[this._case];
        delete protobuf.roots[this._case];
    }

    return TestCase;
}());
