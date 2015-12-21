#!/usr/bin/env node
'use strict';

let fs = require('fs');
let path = require('path');
let resolvePath = path.resolve;

let uglify = require('uglify-js');

let modules = (function() {
    let ret = {};

    let paths = process.argv.slice(2);

    if(paths.length !== 2) {
        console.error(
            "Wrong number of arguments:",
            "Expected exactly 2 module paths."
        );

        process.exit(-1);
    }

    ['a', 'b'].forEach(function(side, i) {
        ret[side] = require(resolvePath(paths[i]));
    });

    return ret;
})();

function minify(fn) {
    return uglify.minify('fn = ' + fn.toString(), { fromString: true }).code;
}


function typeOf(val) {
  return ({}).toString.call(val).match(/\s([a-zA-Z]+)/)[1];
}

function eq(vals) {
    let types = {};

    ['a', 'b'].forEach(function(side) {
        types[side] = typeOf(vals[side]);
    });

    if(types.a !== types.b) {
        return false;
    }

    return (eq[types.a] || eq.default)(vals);
}


eq.default = function(vals) {
    return (vals.a === vals.b);
};

eq.Date = function(vals) {
    return (vals.a.getTime() === vals.b.getTime());
};

eq.Function = function(vals) {
    return (minify(vals.a) === minify(vals.b));
};

function toString(val) {
    return (toString[typeOf(val)] || toString.default)(val);
}

toString.default = function(val) {
    return val.toString();
};

toString.Undefined = function() {
    return 'undefined';
};

toString.Null = function() {
    return 'null';
};

toString.String = function(val) {
    return JSON.stringify(val);
};

toString.Object = function() {
    return 'object';
};

toString.Array = function() {
    return 'array';
};

toString.Function = function() {
    return 'fn';
};

(function recurse(objs, path) {
    path = path || [];

    new Set(
        Object.keys(objs.a).concat(Object.keys(objs.b))
    ).forEach(function(key) {
        let valPath = path.concat([key]);

        let valPathString = valPath.join('.');

        let vals = {};

        ['a', 'b'].forEach(function(side) {
            vals[side] = objs[side][key];
        });

        if(eq(vals)) {
            console.log(valPathString + ": equal (" + toString(vals.a) + ")");
            return;
        }

        let types = {};

        ['a', 'b'].forEach(function(side) {
            types[side] = typeOf(vals[side]);
        });

        if(types.a !== types.b) {
            console.log(
                valPathString + ": not equal (" + toString(vals.a)
                + " vs " + toString(vals.b) + ")"
            );

            return;
        }

        switch(types.a) {
            case 'Object':
            case 'Array':
                recurse({ a: vals.a, b: vals.b }, valPath);
                break;

            default:
                console.log(
                    valPathString + ": not equal (" + toString(vals.a)
                    + " vs " + toString(vals.b) + ")"
                );

                break;
        }
    });
})({ a: modules.a, b: modules.b });
