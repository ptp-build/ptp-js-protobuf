'use strict';

const protobuf = require("protobufjs/minimal");
var TestCase = require('..').TestCase;

function functionalityTest(name, option, testcase, functionality, test) {
    var optionHint = (option ? ' with option "' + option + '"' : '');
    console.log(optionHint)
    testcase.generate(option ? [option] : undefined)
    testcase.requireBundles();
    expect(typeof protobuf.roots[name] === 'object').toBe(true);
    expect(typeof protobuf.roots[name].foo === 'object').toBe(true);
    expect(typeof protobuf.roots[name].bar === 'object').toBe(true);
    expect(typeof protobuf.roots[name].foo.Foo === 'function').toBe(true);
    expect(typeof protobuf.roots[name].bar.Bar === 'function').toBe(true);

    for (var func in functionality) {
        var available = functionality[func];
        console.log({func,available})
        if (func[0] === '#') {
            // instance methods
            func = func.substring(1);
            expect(typeof protobuf.roots[name].foo.Foo.prototype[func] === (available ? 'function' : 'undefined')).toBe(true);
            expect(typeof protobuf.roots[name].bar.Bar.prototype[func] === (available ? 'function' : 'undefined')).toBe(true);
        } else {
            // static method
            expect(typeof protobuf.roots[name].foo.Foo[func] === (available ? 'function' : 'undefined')).toBe(true);
            expect(typeof protobuf.roots[name].bar.Bar[func] === (available ? 'function' : 'undefined')).toBe(true);
        }
    }
    testcase.unrequireBundles();
}
it('cli ', function () {
    new TestCase().loadLibrary('minimal');
    var name = 'cli';
    var testcase1 = new TestCase(name, [ 'foo.proto', 'bar.proto' ]);

    functionalityTest(name, '--no-create', testcase1, {
        'create': false,
        'encode': true, 'encodeDelimited': true,
        'decode': true, 'decodeDelimited': true,
        'fromObject': true, 'toObject': true, '#toJSON': true
    }, test);
})
