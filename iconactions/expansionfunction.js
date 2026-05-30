;(() => {
    superFetchHook.hookLang({
        'capitalize': '首字母大写',
        'htmlFns': 'html相关',
        'toElement': '字符转成元素对象',
        'getAttribute': '获取元素属性',
        'getAttribute-desc': '此时替换值为属性名，模式为参数，多个用|分隔，如果是方法名的话就返回执行结果',
        'getComputedStyle': '获取元素样式',
        'getComputedStyle-desc': '获取元素样式，此时替换为属性名，模式为伪类',
        'valueRelation': '值相关',
        'getVal': '取值',
        'setValue': '设置值',
        'setValue-desc': '此时替换项为要设置的变量名，为空表示设置当前值，正则项为设置的值或变量，当用函数时语法为{变量}.函数名|参数1,参数2...',
        'getVal-desc': '从符号表中取值，替换项为变量名，无需{}',
        'toNumber': '转为数字',
        'o2Array': 'iterator转数组',
        'toArrays': '单体转数组',
        'str2Array': '字符转数组',
        'str2Array-desc': '此时替换值项为分隔符',
        'array2str': '数组转字符串',
        'array2str-desc': '此时替换值项为分隔符',
        'executeCmd': '执行命令',
        'executeCmd-desc': '替换项为程序路径，模式项为参数，可使用{变量名}，会解析替换成变量值',
        'haveReturn': '有结果值返回调用',
        'haveReturn-desc': '替换值项为程序路径，模式项为参数,[arg1,arg2],{}使用变量',
        'cmdNoReturn': '无需返回值',
        'ifBranch': '简单的if和中断',
        'else-desc': '前一个if判断为false时执行该项后面的所有操作',
        'endIf-desc': '可以断续执行该项后面的操作',
        'break': '中断当前项的所有值操作',
        'stopProcess': '结束当前整个操作',
        'throwException': '抛出异常信息',
        'exceptionMessage': '异常消息，格式同打印到控制台',
        'include': '包含',
        'strRegexTest': '字符串正则测试',
        'v1': '值1,可为变量',
        'v2': '值2,可为变量',
        'eq': '=',
        'gt': '>',
        'gte': '>=',
        'lt': '<',
        'lte': '<=',
        'neq': '!=',
        'isBreak': '勾选满足条件时中断，否则继续执行，不勾选则相反',
        'string': '字符串',
        'number': '数字',
        'isTrue': '是否为真',
        'isFalse': '是否为假',
        'completeTrue': '是否完全为真',
        'completeFalse': '是否完全为假',
        'array': '数组',
        'bool': '布尔',
        'object': '对象',
        'variable': '变量',
        'pushArrayValue': '向数组末尾添加一个值',
        'pushArrayArray': '向数组末尾添加一个数组内的值',
        'func': '函数',
    });
    const lang = superFetchHook.lang, getValue = superFetchHook.getVariable;
    superFetchHook.mergeMap(superFetchHook.valueHandlers.simpleValueHandlers.handlers, {
        capitalize: s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(),
    })
    superFetchHook.mergeMap(superFetchHook.valueHandlers.codeRelate.handlers, {
        jsonEncode: JSON.stringify,
        jsonDecode: JSON.parse,
    });

    superFetchHook.simpleValueHandlerHelper.addHandlers('htmlFns', {
        toElement: s => superFetchHook.templateHelper.createElement('div', s).children[0],
        getAttribute(el, item) {
            const v = getValue(el, item.replaceValue);
            if ('function' !== typeof v) {
                return v
            }
            const call = v.bind(el);
            const p = item.pattern ? item.pattern.split('|') : '';
            return p ? call(...p) : call();
        },
        getComputedStyle(el, item) {
            return getValue(getComputedStyle(el, item.pattern ? item.pattern : null), item.replaceValue)
        },
    }, {scope: {fetch: {fetch: '*', handle: 'getAttribute,getComputedStyle'}}});


    superFetchHook.simpleValueHandlerHelper.addHandlers('ifBranch', {
        if: {
            fn: async (value, item, param) => {
                const o = superFetchHook.valueHandlers['ifBranch'];
                const v1 = superFetchHook.fetchActionHelper.getVar(item['v1'], param);
                const compareType = item.compareType, compareFn = o.compareFn[compareType];
                const v2 = superFetchHook.fetchActionHelper.getVar(item['v2'], param);
                const valFn = o.valueType[item.valueType];
                const r = o.noType.has(compareType) ? compareFn(v1, v2, item) : compareFn(valFn(v1), valFn(v2), item);
                const fn = superFetchHook.fetchActionHelper.extractHandlers(param, p => {
                    const elseIndex = p.handlers.findIndex(v => v.rangeHandle === 'else');
                    if (elseIndex > -1) {
                        return p.handlers.splice(0, elseIndex);
                    }
                    const endIndex = p.handlers.findIndex(v => v.rangeHandle === 'endif');
                    return p.handlers.splice(0, endIndex > -1 ? endIndex : p.handlers.length);
                });
                if (r) {
                    value = await fn(value, item, param);
                }
                return value;
            },
            show(li, vars) {
                const o = superFetchHook.valueHandlers['ifBranch'];
                const compare = superFetchHook.templateHelper.createElement('select', {
                    name: 'compareType',
                    className: 'show',
                    innerHTML: buildOption(Object.keys(o.compareFn).map(v => [v, superFetchHook.mapTitle[v]]), vars?.compareType, 0, 1)
                });
                const v1 = o.createInput('v1', {value: vars?.['v1'] ?? ''}),
                    v2 = o.createInput('v2', {value: vars?.['v2'] ?? ''});

                const replaceSelect = li.querySelector('.fetch-replacement-target');
                const replaceValueEle = li.querySelector('.fetch-replacement-value');
                if (replaceValueEle) {
                    replaceValueEle.replaceWith(v1);
                    li.querySelector('.pattern').replaceWith(compare);
                } else {
                    [v1, compare].reduce((pre, cur) => pre.insertAdjacentElement('afterend', cur), replaceSelect);
                }
                const valueType = superFetchHook.templateHelper.createElement('select', {
                    name: 'valueType',
                    className: 'show',
                    innerHTML: buildOption(Object.keys(o.valueType).map(v => [v, lang(v)]), vars?.valueType, 0, 1),
                });
                const pattern = superFetchHook.templateHelper.buildFormElement.input('regPattern', vars?.pattern ?? '', {className: 'show'});

                [v2, pattern, valueType].reduce((pre, cur) => pre.insertAdjacentElement('afterend', cur), compare);
            }
        },
        endIf: {
            fn: v => v,
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    rangeHandle: {
                        type: 'text',
                        hook: el => el.value = 'endif',
                        attrs: {
                            className: 'hidden',
                        }
                    }
                }
            }
        },
        else: {
            async fn(value, item, param) {
                const fn = superFetchHook.fetchActionHelper.extractHandlers(param, 'endif');
                value = await fn(value, item, param)
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    rangeHandle: {
                        type: 'text',
                        hook: el => el.value = 'else',
                        attrs: {
                            className: 'hidden',
                        }
                    }
                }
            }
        },
        break: {
            fn: (value, item) => (item.break = true, value),
            param: {
                mountElementSelector: '.fetch-replacement-target',
            }
        },
        stopProcess: {
            fn: (value, item, param) => {
                item.break = true;
                param.stopProcess = true;
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
            }
        },
        throwException: {
            fn(value, item) {
                const err = new Error(item.exceptionMessage);
                err.code = 'userThrow';
                throw err;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    exceptionMessage: {
                        type: 'text',
                        width: '12vw',
                    }
                }
            }
        }

    }, {
        scope: {fetch: {fetch: '*'}},
        createInput(name, attr = {}) {
            const title = superFetchHook.mapTitle[`${name}-desc`] ?? superFetchHook.mapTitle[name] ?? name;
            return superFetchHook.templateHelper.createElement('input', {
                name: name, placeholder: title, title: title,
                type: 'text', className: 'show', ...attr
            });
        },
        valueType: {
            string: String,
            number: Number,
        },
        noType: new Set(['include', 'strRegexTest', 'isTrue', 'isFalse', 'completeTrue', 'completeFalse']),
        compareFn: {
            include: (v1, v2) => v1?.includes ? v1.includes(v2) : v1.hasOwnProperty(v2),
            strRegexTest: (v1, v2, item) => {
                v2 = new RegExp(v2, item?.regPattern ?? '');
                return v2.test(v1)
            },
            eq: (v1, v2) => v1 === v2,
            gt: (v1, v2) => v1 > v2,
            gte: (v1, v2) => v1 >= v2,
            lt: (v1, v2) => v1 < v2,
            lte: (v1, v2) => v1 <= v2,
            neq: (v1, v2) => v1 !== v2,
            isTrue: v => Boolean(v),
            isFalse: v => !Boolean(v),
            completeTrue: v => v === true,
            completeFalse: v => v === false,
        },
    });
    superFetchHook.simpleValueHandlerHelper.addHandlers('executeCmd', {
        haveReturn: {
            fn: async (value, item, param) => {
                const req = superFetchHook.valueHandlers.executeCmd.req;
                item.pattern = superFetchHook.fetchActionHelper.replaceVars2Format(param.vars, item.pattern);
                //const args = JSON.parse(item.pattern)
                const r = await req({cmd: item.replaceValue, args: shellQuote.parse(item.pattern)}, 'cmd');
                //console.log(r.response);
                return r.response;
            },
            showInput: 'replaceValue,pattern',
        },
        cmdNoReturn: {
            fn(value, item, param) {
                const req = superFetchHook.valueHandlers.executeCmd.req;
                item.pattern = superFetchHook.fetchActionHelper.replaceVars2Format(param.vars, item.pattern);
                req({
                    cmd: item.replaceValue,
                    args: shellQuote.parse(item.pattern)
                }, 'cmd').then(r => console.log(r.response));
                return value;
            },
            showInput: 'replaceValue,pattern',
        }
    }, {
        scope: {fetch: {fetch: '*'}},
        async req(data, path) {
            return new Promise((resolve) => {
                request(data, path, res => {
                    resolve(res)
                });
            })
        }
    });

    superFetchHook.simpleValueHandlerHelper.addHandlers('valueRelation', {
        getVal: {
            fn: (val, item, param) => getValue(param.vars, item.replaceValue),
            showInput: 'replaceValue', // replaceValue|pattern
        },
        setValue: {
            fn(_, item, param) {
                const v = superFetchHook.valueHandlers.valueRelation.buildValue(item, param);
                const [name, g] = item.replaceValue.split('|');
                const m = {g: param.globalVars, p: param.parentVars};
                const vars = m?.[g] ?? param.vars;
                if (!name) {
                    return v;
                }
                const names = name.split('.').map(vv => getValue(param.vars, vv, vv, true)).join('.')
                setMapVal(names, v, vars);
                return _;
            },
            show(li, vars) {
                const t = li.querySelector('.templateVar');
                if (!t || 'INPUT' !== t.nodeName) {
                    return
                }
                li.querySelector('.fetch-replacement-value').insertAdjacentElement('afterend', t);
                const v = superFetchHook.valueHandlers.valueRelation;
                const select = superFetchHook.templateHelper.createElement('select', {
                    name: 'variableType',
                    className: 'variableType show',
                    innerHTML: buildOption(Object.keys(v.valueType).map(v => [
                        v, lang(v), `title="${superFetchHook.mapTitle?.[v + '-desc'] ?? lang(v)}"`
                    ]), vars?.variableType, 0, 1, 2)
                });
                t.replaceWith(select);
            },
            showInput: 'replaceValue,pattern,variableType',
        },
        pushArrayValue: {
            fn(_, item, param) {
                const v = superFetchHook.valueHandlers.valueRelation.buildValue(item, param);
                const arr = superFetchHook.fetchActionHelper.getVar(item.replaceValue, param, true);
                arr.push(v);
                return _;
            },
            show(li, vars) {
                superFetchHook.valueHandlers.valueRelation.handlers.setValue.show(li, vars);
            },
            showInput: 'replaceValue,pattern,variableType',
            extraShowInput: '[name=variableType]',
        },
        pushArrayArray: {
            fn(_, item, param) {
                const v = superFetchHook.valueHandlers.valueRelation.buildValue(item, param);
                const arr = superFetchHook.fetchActionHelper.getVar(item.replaceValue, param, true);
                arr.push(...v);
                return _;
            },
            show(li, vars) {
                superFetchHook.valueHandlers.valueRelation.handlers.setValue.show(li, vars);
                li.querySelector('.variableType').classList.remove('show');
            },
            showInput: 'replaceValue,pattern',
        },
        toNumber: Number,
        str2Array: {
            fn: (s, item) => Array.isArray(s) ? s : s.split(item.replaceValue),
            showInput: 'replaceValue',
        },
        o2Array: arr => [...arr],
        toArrays: arr => [arr],
        array2str: {
            fn: (arr, item) => arr.join(item.replaceValue),
            showInput: 'replaceValue',
        },
    }, {
        scope: {fetch: {fetch: '*', handle: 'getVal'}, replacement: 'setValue'},
        buildValue(item, param) {
            const value = item.pattern;
            return this.valueType[item.variableType](value, param.vars);
        },

        valueType: {
            variable: (value, vars) => getValue(vars, value),
            ...superFetchHook.valueHandlers.ifBranch.valueType,
            func: (v, vars) => {
                let [fn, param] = v.split('|');
                if (superFetchHook.fetchActionHelper.reg.test(v)) {
                    const f = fn.split('.');
                    const value = f.slice(0, f.length - 1).join('.');
                    const o = getValue(vars, value, value, true);
                    const fnName = f[f.length - 1];
                    fn = getValue(o, fnName, fnName).bind(o)
                } else {
                    if (fn.includes('.')) {
                        const f = fn.split('.');
                        const value = f.slice(0, f.length - 1).join('.');
                        const o = getValue(superFetchHook.fetchActionHelper.global.$eval, value);
                        fn = o[f[f.length - 1]].bind(o);
                    } else {
                        fn = superFetchHook.fetchActionHelper.global.$eval[fn]
                        if ('function' !== typeof fn) {
                            return fn;
                        }
                    }
                }
                let args;
                if (param) {
                    args = param.split(',').map(a => getValue(vars, a, a, true))
                }
                return args ? fn(...args) : fn();
            },
            array: (v, vars) => {
                if (!v) {
                    return []
                }
                return v.split(',').map(value => getValue(vars, value, value, true));
            },
            bool: v => '1' === v,
            object: (v, vars) => {
                const o = new Function('return ' + v)();
                iterateObjByKey(o, (k, v) => {
                    if ('string' !== typeof v) {
                        return
                    }
                    const kk = getValue(vars, k, k, true);
                    const vv = getValue(vars, v, v, true);
                    if (v !== vv) {
                        o[k] = vv;
                    }
                    if (k !== kk) {
                        o[kk] = o[k];
                        delete o[k];
                    }
                }, false);
                return o;
            }
        }
    });


    superFetchHook.hookLang({
        'simpleCalculator': '简单计算器',
        'addx': '➕',
        'subtract': '➖',
        'multiply': '✖',
        'divide': '➗',
        'arithmetic': '四则运算',
        'complementation': '%',
    });


    superFetchHook.simpleValueHandlerHelper.addHandlers('simpleCalculator', {
        calculator: {
            fn(value, item, param) {
                const num = 'variable' === item.operatedTarget ? superFetchHook.getVariable(param.vars, item.operatedNumber, 0) : Number(item.operatedNumber);
                return superFetchHook.valueHandlers.simpleCalculator.arithmetic[item.operator](Number(value), num)
            },
            text: lang('arithmetic'),
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    operator: {
                        width: '4vw',
                        type: 'select',
                        getOptions(val) {
                            const o = Object.keys(superFetchHook.valueHandlers.simpleCalculator.arithmetic)
                                .map(k => [k, lang(k)]);
                            return buildOption(o, val, 0, 1)
                        },
                        diffSelector: '[name=operator]:has(option[name=adds])',
                    },
                    operatedTarget: {
                        type: 'select',
                        getOptions(val) {
                            return buildOption({number: lang('number'), variable: lang('variable')}, val);
                        },
                        attrs: {
                            onchange: evt => superFetchHook.valueHandlers.simpleCalculator.change[evt.target.value](evt.target.nextElementSibling),
                        }
                    },
                    operatedNumber: {
                        type: 'number',
                        width: '5vw',
                        hook(input, value, vars) {
                            input.type = 'number' === vars.operatedTarget ? 'number' : 'text';
                            input.value = value;
                        }
                    },
                },
            },
        }
    }, {
        change: {
            number: el => (el.type = 'number', el.value = 0),
            variable: el => (el.type = 'text', el.value = ''),
        },
        arithmetic: {
            addx: (num1, num2) => num1 + num2,
            subtract: (num1, num2) => num1 - num2,
            multiply: (num1, num2) => num1 * num2,
            divide: (num1, num2) => num1 / num2,
            complementation: (num1, num2) => num1 % num2,
        },
        scope: {fetch: {fetch: '*'}}
    });


    // todo hi guys, glad to see you here.
    //  welcome to add other sector function, like http, call local program, math and so on.
    //  totally welcome to add this project unlimited possibility.
    //  wish you to give full play to the imagination to create unlimited possibility.
})();