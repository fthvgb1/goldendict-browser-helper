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
        'getVal-desc': '从符号表中取值，替换项为变量名，无需{}',
        'toNumber': '转为数字',
        'o2Array': '转为数组',
        'str2Array': '字符转数组',
        'str2Array-desc': '此时替换值项为分隔符',
        'array2str': '数组转字符串',
        'array2str-desc': '此时替换值项为分隔符',
        'executeCmd': '执行命令',
        'haveReturn': '有结果值返回调用',
        'haveReturn-desc': '替换值项为程序路径，模式项为参数,[arg1,arg2],{}使用变量',
        'cmdNoReturn': '无需返回值',
        'ifBranch': '简单的if分支',
        'break': '中断',
        'include': '包含',
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
        'func': '固有函数',
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
            fn: (value, item, param) => {
                const o = superFetchHook.valueHandlers['ifBranch'];
                const v1 = superFetchHook.fetchActionHelper.getDefVars(item['v1'], param.vars);
                const compareType = item.compareType, compareFn = o.compareFn[compareType];
                const v2 = superFetchHook.fetchActionHelper.getDefVars(item['v2'], param.vars)
                const valFn = o.valueType[item.valueType];
                const r = o.noType.has(compareType) ? compareFn(v1, v2) : compareFn(valFn(v1), valFn(v2));
                if ((item.isBreak && r) || (!item.isBreak && !r)) {
                    item.break = true;
                    return value;
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
                const breaks = superFetchHook.templateHelper.createElement('input', {
                    type: 'checkbox',
                    name: 'isBreak', className: 'show',
                    title: lang('isBreak')
                });
                vars?.isBreak && (breaks.checked = true);
                li.querySelector('.fetch-replacement-value').replaceWith(v1);
                li.querySelector('.pattern').replaceWith(compare);
                const valueType = superFetchHook.templateHelper.createElement('select', {
                    name: 'valueType',
                    className: 'show',
                    innerHTML: buildOption(Object.keys(o.valueType).map(v => [v, lang(v)]), vars?.valueType, 0, 1),
                });
                [v2, valueType, breaks].reduce((pre, cur) => pre.insertAdjacentElement('afterend', cur), compare);
            }
        },
        break: {
            fn: (value, item) => (item.break = true, value),
            show: (li, vars) => {
                const o = superFetchHook.valueHandlers['ifBranch'];
                const replaceValue = o.createInput('replaceValue', {className: 'fetch-replacement-value'});
                const pattern = o.createInput('pattern', {className: 'pattern'});
                li.querySelectorAll('.fetch-replacement-target ~:not(button)').forEach(el => el.remove());
                [replaceValue, pattern].reduce((pre, cur) => pre.insertAdjacentElement('afterend', cur),
                    li.querySelector('.fetch-replacement-target'));
            }
        },

    }, {
        scope: {fetch: {fetch: '*'}},
        createInput(name, attr = {}) {
            return superFetchHook.templateHelper.createElement('input', {
                name: name, placeholder: lang(name), title: lang(name),
                type: 'text', className: 'show', ...attr
            });
        },
        valueType: {
            string: String,
            number: Number,
        },
        noType: new Set(['include', 'isTrue', 'isFalse', 'completeTrue', 'completeFalse']),
        compareFn: {
            include: (v1, v2) => v1?.includes ? v1.includes(v2) : v1.hasOwnProperty(v2),
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

    function req(data, path) {
        return new Promise((resolve) => {
            request(data, path, res => {
                resolve(res)
            });
        })
    }

    superFetchHook.simpleValueHandlerHelper.addHandlers('executeCmd', {
        /*haveReturn:{
            fn:async (value,item,param)=>{
                item.pattern=superFetchHook.fetchActionHelper.replaceVars2Format(param.vars,item.pattern);
                //const args = JSON.parse(item.pattern)
                const r = await req({cmd:item.replaceValue,args:item.pattern},'cmd');
                console.log(r.response);
                return r.response;
            },
            showInput: 'replaceValue,pattern',
        },*/
        cmdNoReturn: {
            fn(value, item, param) {
                item.pattern = superFetchHook.fetchActionHelper.replaceVars2Format(param.vars, item.pattern);
                req({cmd: item.replaceValue, args: item.pattern}, 'cmd').then(r => console.log(r.response));
                return value;
            },
            showInput: 'replaceValue,pattern',
        }
    }, {scope: {fetch: {fetch: '*'}}});

    superFetchHook.simpleValueHandlerHelper.addHandlers('valueRelation', {
        getVal: {
            fn: (val, item, param) => getValue(param.vars, item.replaceValue),
            showInput: 'replaceValue', // replaceValue|pattern
        },
        setValue: {
            fn(_, item, param) {
                const v = superFetchHook.valueHandlers.valueRelation.buildValue(item, param);
                const [name, g] = item.replaceValue.split('|');
                const vars = g === 'g' ? param.globalVars : param.vars;
                vars[name] = v;
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
                const [name, g] = item.replaceValue.split('|');
                const vars = g === 'g' ? param.globalVars : param.vars;
                vars[name].push(v);
                return _;
            },
            show(li, vars) {
                superFetchHook.valueHandlers.valueRelation.handlers.setValue.show(li, vars);
            },
            showInput: 'replaceValue,pattern,variableType',
            extraShowInput: '[name=variableType]',
        },
        toNumber: Number,
        str2Array: (s, item) => s.split(item.replaceValue),
        o2Array: arr => [...arr],
        array2str: (arr, item) => arr.join(item.replaceValue),
    }, {
        scope: {fetch: {fetch: '*', handle: 'getVal'}},
        buildValue(item, param) {
            const value = item.pattern;
            return this.valueType[item.variableType](value, param.vars);
        },

        valueType: {
            variable: (value, vars) => getValue(vars, value),
            ...superFetchHook.valueHandlers.ifBranch.valueType,
            func: (v, vars) => {
                let [fn, param] = v.split('|');
                const f = fn.split('.');
                const val = getValue(vars, f[0], f[0], true);
                const n = f.slice(1).join('.');
                fn = getValue(val, n, n).bind(val)
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


    // todo hi guys, glad to see you here.
    //  welcome to add other sector function, like http, call local program, math and so on.
    //  totally welcome to add this project unlimited possibility.
    //  wish you to give full play to the imagination to create unlimited possibility.
})();