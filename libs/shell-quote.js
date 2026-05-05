/******/
(() => { // webpackBootstrap
    /******/
    var __webpack_modules__ = ({

        /***/ "./node_modules/babel-loader/lib/index.js??ruleSet[1].rules[1].use!./src/index.js"
        /*!****************************************************************************************!*\
          !*** ./node_modules/babel-loader/lib/index.js??ruleSet[1].rules[1].use!./src/index.js ***!
          \****************************************************************************************/
            (__unused_webpack_module, __webpack_exports__, __webpack_require__) {

            "use strict";
            __webpack_require__.r(__webpack_exports__);
            /* harmony export */
            __webpack_require__.d(__webpack_exports__, {
                /* harmony export */   parse: () => (/* reexport safe */ shell_quote__WEBPACK_IMPORTED_MODULE_0__.parse)
                /* harmony export */
            });
            /* harmony import */
            var shell_quote__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! shell-quote */ "./node_modules/shell-quote/index.js");


            /***/
        },

        /***/ "./src/index-exposed.js"
        /*!******************************!*\
          !*** ./src/index-exposed.js ***!
          \******************************/
            (module, __unused_webpack_exports, __webpack_require__) {

            var ___EXPOSE_LOADER_IMPORT___ = __webpack_require__(/*! -!../node_modules/babel-loader/lib/index.js??ruleSet[1].rules[1].use!./index.js */ "./node_modules/babel-loader/lib/index.js??ruleSet[1].rules[1].use!./src/index.js");
            var ___EXPOSE_LOADER_GET_GLOBAL_THIS___ = __webpack_require__(/*! ../node_modules/expose-loader/dist/runtime/getGlobalThis.js */ "./node_modules/expose-loader/dist/runtime/getGlobalThis.js");
            var ___EXPOSE_LOADER_GLOBAL_THIS___ = ___EXPOSE_LOADER_GET_GLOBAL_THIS___;
            if (typeof ___EXPOSE_LOADER_GLOBAL_THIS___["shellQuote"] === 'undefined') ___EXPOSE_LOADER_GLOBAL_THIS___["shellQuote"] = ___EXPOSE_LOADER_IMPORT___;
            else throw new Error('[exposes-loader] The "shellQuote" value exists in the global scope, it may not be safe to overwrite it, use the "override" option')
            module.exports = ___EXPOSE_LOADER_IMPORT___;


            /***/
        },

        /***/ "./node_modules/expose-loader/dist/runtime/getGlobalThis.js"
        /*!******************************************************************!*\
          !*** ./node_modules/expose-loader/dist/runtime/getGlobalThis.js ***!
          \******************************************************************/
            (module, __unused_webpack_exports, __webpack_require__) {

            "use strict";


// eslint-disable-next-line func-names
            module.exports = function () {
                if (typeof globalThis === "object") {
                    return globalThis;
                }
                var g;
                try {
                    // This works if eval is allowed (see CSP)
                    // eslint-disable-next-line no-new-func
                    g = this || new Function("return this")();
                } catch (e) {
                    // This works if the window reference is available
                    if (typeof window === "object") {
                        return window;
                    }

                    // This works if the self reference is available
                    if (typeof self === "object") {
                        return self;
                    }

                    // This works if the global reference is available
                    if (typeof __webpack_require__.g !== "undefined") {
                        return __webpack_require__.g;
                    }
                }
                return g;
            }();

            /***/
        },

        /***/ "./node_modules/shell-quote/index.js"
        /*!*******************************************!*\
          !*** ./node_modules/shell-quote/index.js ***!
          \*******************************************/
            (__unused_webpack_module, exports, __webpack_require__) {

            "use strict";


            exports.quote = __webpack_require__(/*! ./quote */ "./node_modules/shell-quote/quote.js");
            exports.parse = __webpack_require__(/*! ./parse */ "./node_modules/shell-quote/parse.js");


            /***/
        },

        /***/ "./node_modules/shell-quote/parse.js"
        /*!*******************************************!*\
          !*** ./node_modules/shell-quote/parse.js ***!
          \*******************************************/
            (module) {

            "use strict";


// '<(' is process substitution operator and
// can be parsed the same as control operator
            var CONTROL = '(?:' + [
                '\\|\\|',
                '\\&\\&',
                ';;',
                '\\|\\&',
                '\\<\\(',
                '\\<\\<\\<',
                '>>',
                '>\\&',
                '<\\&',
                '[&;()|<>]'
            ].join('|') + ')';
            var controlRE = new RegExp('^' + CONTROL + '$');
            var META = '|&;()<> \\t';
            var SINGLE_QUOTE = '"((\\\\"|[^"])*?)"';
            var DOUBLE_QUOTE = '\'((\\\\\'|[^\'])*?)\'';
            var hash = /^#$/;

            var SQ = "'";
            var DQ = '"';
            var DS = '$';

            var TOKEN = '';
            var mult = 0x100000000; // Math.pow(16, 8);
            for (var i = 0; i < 4; i++) {
                TOKEN += (mult * Math.random()).toString(16);
            }
            var startsWithToken = new RegExp('^' + TOKEN);

            function matchAll(s, r) {
                var origIndex = r.lastIndex;

                var matches = [];
                var matchObj;

                while ((matchObj = r.exec(s))) {
                    matches.push(matchObj);
                    if (r.lastIndex === matchObj.index) {
                        r.lastIndex += 1;
                    }
                }

                r.lastIndex = origIndex;

                return matches;
            }

            function getVar(env, pre, key) {
                var r = typeof env === 'function' ? env(key) : env[key];
                if (typeof r === 'undefined' && key != '') {
                    r = '';
                } else if (typeof r === 'undefined') {
                    r = '$';
                }

                if (typeof r === 'object') {
                    return pre + TOKEN + JSON.stringify(r) + TOKEN;
                }
                return pre + r;
            }

            function parseInternal(string, env, opts) {
                if (!opts) {
                    opts = {};
                }
                var BS = opts.escape || '\\';
                var BAREWORD = '(\\' + BS + '[\'"' + META + ']|[^\\s\'"' + META + '])+';

                var chunker = new RegExp([
                    '(' + CONTROL + ')', // control chars
                    '(' + BAREWORD + '|' + SINGLE_QUOTE + '|' + DOUBLE_QUOTE + ')+'
                ].join('|'), 'g');

                var matches = matchAll(string, chunker);

                if (matches.length === 0) {
                    return [];
                }
                if (!env) {
                    env = {};
                }

                var commented = false;

                return matches.map(function (match) {
                    var s = match[0];
                    if (!s || commented) {
                        return void undefined;
                    }
                    if (controlRE.test(s)) {
                        return {op: s};
                    }

                    // Hand-written scanner/parser for Bash quoting rules:
                    //
                    // 1. inside single quotes, all characters are printed literally.
                    // 2. inside double quotes, all characters are printed literally
                    //    except variables prefixed by '$' and backslashes followed by
                    //    either a double quote or another backslash.
                    // 3. outside of any quotes, backslashes are treated as escape
                    //    characters and not printed (unless they are themselves escaped)
                    // 4. quote context can switch mid-token if there is no whitespace
                    //     between the two quote contexts (e.g. all'one'"token" parses as
                    //     "allonetoken")
                    var quote = false;
                    var esc = false;
                    var out = '';
                    var isGlob = false;
                    var i;

                    function parseEnvVar() {
                        i += 1;
                        var varend;
                        var varname;
                        var char = s.charAt(i);

                        if (char === '{') {
                            i += 1;
                            if (s.charAt(i) === '}') {
                                throw new Error('Bad substitution: ' + s.slice(i - 2, i + 1));
                            }
                            varend = s.indexOf('}', i);
                            if (varend < 0) {
                                throw new Error('Bad substitution: ' + s.slice(i));
                            }
                            varname = s.slice(i, varend);
                            i = varend;
                        } else if ((/[*@#?$!_-]/).test(char)) {
                            varname = char;
                            i += 1;
                        } else {
                            var slicedFromI = s.slice(i);
                            varend = slicedFromI.match(/[^\w\d_]/);
                            if (!varend) {
                                varname = slicedFromI;
                                i = s.length;
                            } else {
                                varname = slicedFromI.slice(0, varend.index);
                                i += varend.index - 1;
                            }
                        }
                        return getVar(env, '', varname);
                    }

                    for (i = 0; i < s.length; i++) {
                        var c = s.charAt(i);
                        isGlob = isGlob || (!quote && (c === '*' || c === '?'));
                        if (esc) {
                            out += c;
                            esc = false;
                        } else if (quote) {
                            if (c === quote) {
                                quote = false;
                            } else if (quote == SQ) {
                                out += c;
                            } else { // Double quote
                                if (c === BS) {
                                    i += 1;
                                    c = s.charAt(i);
                                    if (c === DQ || c === BS || c === DS) {
                                        out += c;
                                    } else {
                                        out += BS + c;
                                    }
                                } else if (c === DS) {
                                    out += parseEnvVar();
                                } else {
                                    out += c;
                                }
                            }
                        } else if (c === DQ || c === SQ) {
                            quote = c;
                        } else if (controlRE.test(c)) {
                            return {op: s};
                        } else if (hash.test(c)) {
                            commented = true;
                            var commentObj = {comment: string.slice(match.index + i + 1)};
                            if (out.length) {
                                return [out, commentObj];
                            }
                            return [commentObj];
                        } else if (c === BS) {
                            esc = true;
                        } else if (c === DS) {
                            out += parseEnvVar();
                        } else {
                            out += c;
                        }
                    }

                    if (isGlob) {
                        return {op: 'glob', pattern: out};
                    }

                    return out;
                }).reduce(function (prev, arg) { // finalize parsed arguments
                    // TODO: replace this whole reduce with a concat
                    return typeof arg === 'undefined' ? prev : prev.concat(arg);
                }, []);
            }

            module.exports = function parse(s, env, opts) {
                var mapped = parseInternal(s, env, opts);
                if (typeof env !== 'function') {
                    return mapped;
                }
                return mapped.reduce(function (acc, s) {
                    if (typeof s === 'object') {
                        return acc.concat(s);
                    }
                    var xs = s.split(RegExp('(' + TOKEN + '.*?' + TOKEN + ')', 'g'));
                    if (xs.length === 1) {
                        return acc.concat(xs[0]);
                    }
                    return acc.concat(xs.filter(Boolean).map(function (x) {
                        if (startsWithToken.test(x)) {
                            return JSON.parse(x.split(TOKEN)[1]);
                        }
                        return x;
                    }));
                }, []);
            };


            /***/
        },

        /***/ "./node_modules/shell-quote/quote.js"
        /*!*******************************************!*\
          !*** ./node_modules/shell-quote/quote.js ***!
          \*******************************************/
            (module) {

            "use strict";


            module.exports = function quote(xs) {
                return xs.map(function (s) {
                    if (s === '') {
                        return '\'\'';
                    }
                    if (s && typeof s === 'object') {
                        return s.op.replace(/(.)/g, '\\$1');
                    }
                    if ((/["\s\\]/).test(s) && !(/'/).test(s)) {
                        return "'" + s.replace(/(['])/g, '\\$1') + "'";
                    }
                    if ((/["'\s]/).test(s)) {
                        return '"' + s.replace(/(["\\$`!])/g, '\\$1') + '"';
                    }
                    return String(s).replace(/([A-Za-z]:)?([#!"$&'()*,:;<=>?@[\\\]^`{|}])/g, '$1\\$2');
                }).join(' ');
            };


            /***/
        }

        /******/
    });
    /************************************************************************/
    /******/ 	// The module cache
    /******/
    var __webpack_module_cache__ = {};
    /******/
    /******/ 	// The require function
    /******/
    function __webpack_require__(moduleId) {
        /******/ 		// Check if module is in cache
        /******/
        var cachedModule = __webpack_module_cache__[moduleId];
        /******/
        if (cachedModule !== undefined) {
            /******/
            return cachedModule.exports;
            /******/
        }
        /******/ 		// Create a new module (and put it into the cache)
        /******/
        var module = __webpack_module_cache__[moduleId] = {
            /******/ 			// no module.id needed
            /******/ 			// no module.loaded needed
            /******/            exports: {}
            /******/
        };
        /******/
        /******/ 		// Execute the module function
        /******/
        if (!(moduleId in __webpack_modules__)) {
            /******/
            delete __webpack_module_cache__[moduleId];
            /******/
            var e = new Error("Cannot find module '" + moduleId + "'");
            /******/
            e.code = 'MODULE_NOT_FOUND';
            /******/
            throw e;
            /******/
        }
        /******/
        __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
        /******/
        /******/ 		// Return the exports of the module
        /******/
        return module.exports;
        /******/
    }

    /******/
    /************************************************************************/
    /******/ 	/* webpack/runtime/define property getters */
    /******/
    (() => {
        /******/ 		// define getter functions for harmony exports
        /******/
        __webpack_require__.d = (exports, definition) => {
            /******/
            for (var key in definition) {
                /******/
                if (__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
                    /******/
                    Object.defineProperty(exports, key, {enumerable: true, get: definition[key]});
                    /******/
                }
                /******/
            }
            /******/
        };
        /******/
    })();
    /******/
    /******/ 	/* webpack/runtime/global */
    /******/
    (() => {
        /******/
        __webpack_require__.g = (function () {
            /******/
            if (typeof globalThis === 'object') return globalThis;
            /******/
            try {
                /******/
                return this || new Function('return this')();
                /******/
            } catch (e) {
                /******/
                if (typeof window === 'object') return window;
                /******/
            }
            /******/
        })();
        /******/
    })();
    /******/
    /******/ 	/* webpack/runtime/hasOwnProperty shorthand */
    /******/
    (() => {
        /******/
        __webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
        /******/
    })();
    /******/
    /******/ 	/* webpack/runtime/make namespace object */
    /******/
    (() => {
        /******/ 		// define __esModule on exports
        /******/
        __webpack_require__.r = (exports) => {
            /******/
            if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
                /******/
                Object.defineProperty(exports, Symbol.toStringTag, {value: 'Module'});
                /******/
            }
            /******/
            Object.defineProperty(exports, '__esModule', {value: true});
            /******/
        };
        /******/
    })();
    /******/
    /************************************************************************/
    /******/
    /******/ 	// startup
    /******/ 	// Load entry module and return exports
    /******/ 	// This entry module is referenced by other modules so it can't be inlined
    /******/
    var __webpack_exports__ = __webpack_require__("./src/index-exposed.js");
    /******/
    /******/
})()
;