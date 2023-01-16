'use strict';
const protobuf = require("protobufjs/minimal");
var TestCase = require('..').TestCase;


it('cli-ts', function () {
    new TestCase().loadLibrary('minimal');
    var name = 'cli_ts';
    var testcase = new TestCase(name, [],"default","protobuf");
    let outCpp = __dirname+"/gen/cpp"
    let outCppTest = __dirname+"/gen/cpp-test"
    let outCppCommandDir = __dirname+"/gen/cpp-test"
    // outCpp = "/Users/jack/projects/ptp/src/ptp_server/actions"
    // outCppTest = "/Users/jack/projects/ptp/tests/test_server/actions"
    testcase.generate([
        '--keep-case' ,
        '--out-cpp',
        outCppCommandDir,
        '--out-cpp-command-dir',
        outCpp,
        '--out-cpp-test',
        outCppTest,
        '--gen-ts',"on",'--pb-dir',__dirname]);
    testcase.loadLibrary('minimal');
})
