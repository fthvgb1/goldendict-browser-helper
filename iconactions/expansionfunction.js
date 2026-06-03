;(() => {
    superFetchHook.hookLang({
        'capitalize': '首字母大写',
        'htmlFns': 'html相关',
        'toElement': '字符转成元素对象',
        'getElementAttribute': '获取元素属性',
        'getElementAttribute-desc': '此时替换值为属性名，模式为参数，多个用|分隔，如果是方法名的话就返回执行结果',
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
        'break': '结束当前项的后续值操作',
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
        'breakIterator': '中断子项查queryAll或遍历',
        'breakChildrenHandle': '中断后续子项',
        'endRangeHandle': '结束前一个作用域',
        'endRangeHandle-desc': '用于结束如url，元素监听等',
    });
    const lang = superFetchHook.lang, getValue = superFetchHook.getVariable;
    superFetchHook.mergeMap(superFetchHook.valueHandlers.simpleValueHandlers.handlers, {
        capitalize: s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(),
    })
    superFetchHook.mergeMap(superFetchHook.valueHandlers.codeRelate.handlers, {
        jsonEncode: JSON.stringify,
        jsonDecode: JSON.parse,
    });

    superFetchHook.hookLang({
        stringToElement: '字符串转元素',
        elementIdentOuterHTML: '字符串可使用{变量}，为空表示使前变量',
        attrName: '属性名，如果为方法名，可以联合参数使用',
        parameter: '参数，多个用|分隔',
        styleAttrName: '样式属性名，伪类用|隔开',
        elementVarName: '元素',
        insertElement: '插入元素',
        beforebegin: '元素自身之前',
        afterbegin: '第一个子元素之前',
        beforeend: '最后一个子元素之后',
        afterend: '元素自身之后',
        position: '位置',
        insertElementType: '插入的类型',
        insertedElement: '插入的元素',
        element: '元素',
        deleteElement: '删除元素',
        deleteElementSelector: '要删除元素的选择器,为空将删除自身',
    });
    superFetchHook.simpleValueHandlerHelper.addHandlers('htmlFns', {
        stringToElement: {
            fn(value, item, param) {
                const html = item.elementIdentOuterHTML ? superFetchHook.fetchActionHelper.replaceVars2Format(param.vars, item.elementIdentOuterHTML) : value;
                return superFetchHook.templateHelper.createElement('div', html).children[0]
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    elementIdentOuterHTML: {
                        type: 'text',
                        width: '10vw',
                    }
                }
            }
        },
        insertElement: {
            fn(value, item, param) {
                const ele = getValue(param.vars, item.elementVarName ? item.elementVarName : param.rule['super-fetch-name']);
                if (!(ele instanceof Element)) {
                    console.log('can parse element', value, item);
                    return value;
                }
                let insertedElement = superFetchHook.fetchActionHelper.replaceVars2Format(param.vars, item.insertedElement);
                if ('element' === item.insertElementType) {
                    insertedElement = getValue(param.vars, item.insertedElement);
                    if (!(insertedElement instanceof Element)) {
                        console.log('can parse insertedElement', value, item);
                        return value;
                    }
                }
                const m = {
                    text: 'insertAdjacentText',
                    html: 'insertAdjacentHTML',
                    element: 'insertAdjacentElement',
                }
                ele[m[item.insertElementType]](item.position, insertedElement);
                return value;
            },
            show(li) {
                li.style.maxWidth = '31vw';
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    elementVarName: {
                        type: 'text',
                        width: '5vw',
                    },
                    position: {
                        type: 'select',
                        width: '6vw',
                        getOptions(v) {
                            const arr = ['beforebegin', 'afterbegin', 'beforeend', 'afterend'].map(p => [p, lang(p)]);
                            return buildOption(arr, v, 0, 1);
                        }
                    },
                    insertElementType: {
                        type: 'select',
                        width: '4vw',
                        getOptions(v) {
                            return buildOption(['text', 'html', 'element'].map(e => [e, lang(e)]), v, 0, 1)
                        }
                    },
                    insertedElement: {
                        type: 'text',
                        width: '23vw',
                    }
                }
            }
        },

        deleteElement: {
            fn(value, item, param) {
                const ele = getValue(param.vars, item.elementVarName ? item.elementVarName : param.rule['super-fetch-name']);
                if (!(ele instanceof Element)) {
                    console.log('can parse element', value, item);
                    return value;
                }
                item.deleteElementSelector ? ele.querySelectorAll(item.deleteElementSelector).forEach(el => el.remove()) : ele.remove();
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    elementVarName: {
                        type: 'text',
                        width: '4vw',
                    },
                    deleteElementSelector: {
                        type: 'text',
                        width: '4vw',
                    }
                }
            }
        },

        getElementAttribute: {
            fn(value, item, param) {
                const ele = getValue(param.vars, item.elementVarName ? item.elementVarName : param.rule['super-fetch-name']);
                if (!(ele instanceof Element)) {
                    console.log('can parse element', value, item);
                    return value;
                }
                const v = getValue(ele, item.attrName);
                if ('function' !== typeof v) {
                    return v
                }
                const call = v.bind(value);
                const p = item.parameter ? item.parameter.split('|') : '';
                return p ? call(...p) : call();
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    elementVarName: {
                        type: 'text',
                        width: '3vw',
                    },
                    attrName: {
                        type: 'text',
                        width: '5vw',
                    },
                    parameter: {
                        type: 'text',
                        width: '3.8vw'
                    }
                }
            }
        },
        getComputedStyle: {
            fn(value, item, param) {
                const ele = superFetchHook.getVariable(param.vars, item.elementVarName ? item.elementVarName : param.rule['super-fetch-name']);
                if (!(value instanceof Element)) {
                    console.log('can parse element', value, item);
                    return value;
                }
                const [attr, pseudoElt] = item.styleAttrName.split('|');
                return getValue(getComputedStyle(ele, pseudoElt), attr);
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    elementVarName: {
                        type: 'text',
                        width: '4vw',
                    },
                    styleAttrName: {
                        type: 'text',
                        width: '6vw',
                    },
                }
            }
        },
    }, {scope: {fetch: {fetch: '*', handle: 'getAttribute,getComputedStyle'}}});


    superFetchHook.simpleValueHandlerHelper.addHandlers('ifBranch', {
        if: {
            identifier: new Set(['if', 'elseif', 'else', 'endif']),
            fn: async (value, item, param) => {
                const o = superFetchHook.valueHandlers['ifBranch'];
                const v1 = superFetchHook.fetchActionHelper.getVar(item['v1'], param);
                const compareType = item.compareType, compareFn = o.compareFn[compareType];
                const v2 = superFetchHook.fetchActionHelper.getVar(item['v2'], param);
                const valFn = o.valueType[item.valueType];
                const r = o.noType.has(compareType) ? compareFn(v1, v2, item) : compareFn(valFn(v1), valFn(v2), item);
                // todo nest
                const fn = superFetchHook.fetchActionHelper.extractHandlers(param, p => {
                    let i = -1;
                    for (const handler of param.handlers) {
                        ++i;
                        if (superFetchHook.valueHandlers.ifBranch.handlers.if.identifier.has(handler?.rangeHandle)) {
                            return p.handlers.splice(0, i);
                        }
                    }
                    return p.handlers.splice(0, p.handlers.length);
                });
                if (r) {
                    value = await fn(value, item, param);
                    if (param.handlers[0]?.rangeHandle === 'else') {
                        const h = param.handlers[0];
                        h.drop = () => (delete h.drop, true);
                    }
                }
                return value;
            },
            show(li, vars, rangeHandle = 'if') {
                const o = superFetchHook.valueHandlers['ifBranch'];
                const compare = superFetchHook.templateHelper.createElement('select', {
                    name: 'compareType',
                    className: 'show',
                    innerHTML: buildOption(Object.keys(o.compareFn).map(v => [v, superFetchHook.mapTitle[v]]), vars?.compareType, 0, 1)
                });
                const v1 = o.createInput('v1', {value: vars?.['v1'] ?? ''}),
                    v2 = o.createInput('v2', {value: vars?.['v2'] ?? ''});
                li.querySelectorAll('.fetch-replacement-target ~ :not(button)').forEach(el => el.remove());
                const replaceSelect = li.querySelector('.fetch-replacement-target');
                [v1, compare].reduce((pre, cur) => pre.insertAdjacentElement('afterend', cur), replaceSelect);
                const valueType = superFetchHook.templateHelper.createElement('select', {
                    name: 'valueType',
                    className: 'show',
                    innerHTML: buildOption(Object.keys(o.valueType).map(v => [v, lang(v)]), vars?.valueType, 0, 1),
                });
                const pattern = superFetchHook.templateHelper.buildFormElement.input('regPattern', vars?.pattern ?? '', {className: 'show'});
                const handleRange = superFetchHook.templateHelper.buildFormElement.input('rangeHandle', rangeHandle, {
                    className: 'hidden',
                    type: 'text'
                });
                [v2, pattern, valueType, handleRange].reduce((pre, cur) => pre.insertAdjacentElement('afterend', cur), compare);
            }
        },
        elseif: {
            async fn(value, item, param) {
                return await superFetchHook.valueHandlers.ifBranch.handlers.if.fn(value, item, param)
            },
            show: (li, vars) => {
                superFetchHook.valueHandlers.ifBranch.handlers.if.show(li, vars, 'elseif');
            }
        },
        else: {
            async fn(value, item, param) {
                const fn = superFetchHook.fetchActionHelper.extractHandlers(param, 'endif');
                if (item?.drop?.()) {
                    return value;
                }
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
        endif: {
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
        break: {
            fn: (value, item) => (item.break = true, value),
            param: {
                mountElementSelector: '.fetch-replacement-target',
            }
        },
        breakIterator: {
            fn: (value, item, param) => (item.break = true, param.breakIterator = true, value),
            param: {
                mountElementSelector: '.fetch-replacement-target',
            }
        },
        breakChildrenHandle: {
            fn: (value, item, param) => (item.break = true, param.breakChildrenHandle = true, value),
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
        },
        endRangeHandle: {
            fn: v => v,
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    rangeHandle: {
                        type: 'text',
                        hook: el => el.value = 'endRangeHandle',
                        attrs: {
                            className: 'hidden',
                        }
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