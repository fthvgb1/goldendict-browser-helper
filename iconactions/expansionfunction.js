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
        'valueExpression': '变量名, format:(name,name|g,name|p)',
        'setValue': '设置值',
        'leftValue': '左值名',
        'rightValue': '右值名',
        'setValue-desc': '将右值赋给左值，当用函数时语法为{变量}.函数名|参数1,参数2...',
        'getVal-desc': '从符号表中取值，无需{}',
        'toNumber': '转为数字',
        'o2Array': 'iterator转数组',
        'o2Array-desc': 'currentValue=[...currentValue]',
        'toArrays': '单体转数组',
        'toArrays-desc': 'currentValue=[currentValue]',
        'str2Array': '字符转数组',
        'array2str': '数组转字符串',
        'executeCmd': '执行外部程序',
        'executeCmd-desc': '替换项为程序路径，模式项为参数，可使用{变量名}，会解析替换成变量值',
        'haveReturn': '有结果值返回调用',
        'haveReturn-desc': '替换值项为程序路径，模式项为参数,[arg1,arg2],{}使用变量',
        'cmdNoReturn': '无需返回值',
        'cmdNoReturnWithPid': '无返回值但获取pid',
        'ifBranch': '简单的if和中断',
        'else-desc': '前一个if判断为false时执行该项后面的所有操作',
        'endIf-desc': '可以断续执行该项后面的操作',
        'break': '中断当前作用域',
        'breaks': '中断当前整个值操作',
        'stopProcess': '结束当前整个操作',
        'throwException': '抛出异常信息',
        'exceptionMessage': '异常消息，格式同打印到控制台',
        'include': '包含',
        'strRegexTest': '字符串正则测试',
        'v1': '值1,可为变量',
        'v2': '值2,可为变量',
        'eq': '===',
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
        'array-desc': 'item1,item2, {varName}',
        'bool': '布尔',
        'bool-desc': 'true: 1, false: 0',
        'object': '对象',
        'object-desc': '{attr:attr,attr:{attr:attr},"{varName}":attr,"{varName}":"{varName}","attr":"attr"}',
        'variable': '变量',
        'arrayUnshift': '向数组开开始位置添加一个值',
        'arrayUnshift-desc': 'arr.unshift(value)',
        'pushArrayValue': '向数组末尾添加一个值',
        'pushArrayValue-desc': 'arr.push(value)',
        'pushArrayArray': '向数组末尾添加一个数组内的值',
        'pushArrayArray-desc': 'arrA.push(...arrB)',
        'deleteVariable': '删除一个变量',
        'varName': '变量名',
        'func': '函数',
        'func-desc': 'obj.attr.attr|arg,{argvName},  functionName|arg,{argvName}',
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
        setElementVarName: '要设置的变量名,为空表示当前值',
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
        editElementAttribute: '修改元素属性',
        attrValue: '属性值',
        addNode: '添加为节点',
        attrNameForSetting: '属性名',
        elementSelector: '选择器',
        queryAll: '获取全部',
        anchorMode: '锚点模式',
        queryElementVarName: '元素，为空表示为 document',
        queryElement: '查找元素',
        replaceElement: '替换元素',
        neededReplaceElement: '需要被替换的元素,为空表示当前值',
        replaceElementName: '替换的元素,可使用{变量}，不使用则将创建',
        cloneElement: '克隆元素',
        cloneTarget: '要克隆的元素名,可使用{变量}',
        cloneDeep: '深度克隆',
        cloneTo: '克隆后赋值给',
    });
    superFetchHook.simpleValueHandlerHelper.addHandlers('htmlFns', {
        stringToElement: {
            fn(value, item, param) {
                const html = superFetchHook.fetchActionHelper.replaceVars2Format(param.vars, item.elementIdentOuterHTML);
                const ele = superFetchHook.templateHelper.createElement('div', html).children[0];
                if (!item.setElementVarName) {
                    return ele;
                }
                param.vars[item.setElementVarName] = ele;
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    setElementVarName: {
                        type: 'text',
                        width: '3vw',
                    },
                    elementIdentOuterHTML: {
                        type: 'text',
                        width: '9vw',
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
                        attrs: {
                            className: 'show needStretch'
                        }
                    }
                }
            }
        },

        deleteElement: {
            fn(value, item, param) {
                const name = item.elementVarName ? item.elementVarName : param.rule['super-fetch-name'];
                const ele = superFetchHook.fetchActionHelper.getVar(name, param, true);
                if ('string' === typeof ele && ele) {
                    const el = superFetchHook.templateHelper.createElement('div', value);
                    el.querySelectorAll(item.deleteElementSelector).forEach(el => el.remove());
                    param.vars[name] = el.innerHTML;
                    return param.vars[param.rule['super-fetch-name']];
                }
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
                        width: '7vw',
                    }
                }
            }
        },

        replaceElement: {
            fn(value, item, param) {
                let v = false;
                let ele = item.elementVarName ? getValue(param.vars, item.elementVarName) : (v = true, value);
                let replacement = getValue(param.vars, item.replaceElementName);
                const fn = replacement => {
                    superFetchHook.templateHelper.isInDocument(ele) ? ele.replaceWith(replacement) : (ele = replacement);
                    if (v) {
                        return ele;
                    }
                    setMapVal(superFetchHook.fetchActionHelper.replaceVars2Format(param.vars, item.elementVarName), ele, param.vars);
                    return value;
                }
                if (replacement instanceof Element) {
                    return fn(replacement);
                }
                replacement = superFetchHook.templateHelper.createElement('div', superFetchHook.fetchActionHelper.replaceVars2Format(param.vars, item.replaceElementName)).children[0];
                return fn(replacement)
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    elementVarName: {
                        title: lang('neededReplaceElement'),
                        type: 'text',
                        width: '4vw',
                    },
                    replaceElementName: {
                        type: 'text',
                        width: '8vw',
                    }
                }
            }
        },

        cloneElement: {
            fn(value, item, param) {
                const target = superFetchHook.fetchActionHelper.getVar(item.cloneTarget, param, true);
                const name = superFetchHook.fetchActionHelper.replaceVars2Format(param.vars, item.elementVarName);
                param.vars[name] = target.cloneNode(item.cloneDeep);
                return param.vars[param.rule['super-fetch-name']];
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    cloneTarget: {
                        type: 'text',
                        width: '5vw',
                    },
                    cloneDeep: {
                        type: 'checkbox',
                    },
                    elementVarName: {
                        title: lang('cloneTo'),
                        type: 'text',
                        width: '5vw',
                    },
                }
            }
        },

        queryElement: {
            fn(value, item, param) {
                const ele = item.elementVarName ? getValue(param.vars, item.elementVarName) : document;
                if (item.anchorMode) {
                    return superFetchHook.fetchActionHelper.anchor2Ele({
                        'value-selector': item.elementSelector,
                        'multiple_child': item.queryAll
                    }, ele);
                }
                return item.queryAll ? ele.querySelectorAll(item.elementSelector) : ele.querySelector(item.elementSelector);
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    elementVarName: {
                        type: 'text',
                        title: lang('queryElementVarName'),
                        width: '4vw',
                    },
                    elementSelector: {
                        type: 'text',
                        width: '6.4vw',
                    },
                    queryAll: {
                        type: 'checkbox',
                        afterInsertDoc(ele) {
                            ele.addEventListener('change', evt => {
                                const classList = ele.nextElementSibling.classList;
                                ele.checked ? classList.remove('show') : classList.add('show')
                            });
                            return ele;
                        }
                    },
                    anchorMode: {
                        type: 'checkbox',
                        afterInsertDoc: el => el.previousElementSibling.checked ? el.classList.remove('show') : el.classList.add('show')
                    },
                }
            }
        },

        editElementAttribute: {
            fn(value, item, param) {
                const ele = getValue(param.vars, item.elementVarName ? item.elementVarName : param.rule['super-fetch-name']);
                if (!(ele instanceof Element)) {
                    console.log('can parse element', value, item);
                    return value;
                }

                const attrValue = superFetchHook.getVariable(param.vars, item.attrValue, item.attrValue);
                const attrName = superFetchHook.fetchActionHelper.replaceVars2Format(param.vars, item.attrName);
                if (item.addNode) {
                    ele.setAttribute(attrName, attrValue);
                } else {
                    setMapVal(attrName, attrValue, ele);
                }
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    elementVarName: {
                        type: 'text',
                        width: '3vw',
                    },
                    attrName: {
                        title: lang('attrNameForSetting'),
                        type: 'text',
                        width: '3.8vw',
                    },
                    attrValue: {
                        type: 'text',
                        width: '3.8vw'
                    },
                    addNode: {
                        type: 'checkbox'
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
            async fn(value, item, param) {
                param.handlers.unshift(async () => await superFetchHook.valueHandlers.ifBranch.handlers.if.ifFn(value, item, param));
                const fn = superFetchHook.fetchActionHelper.extractHandlers(param, ['if', 'endif']);
                return await fn(value);
            },
            ifFn: async (value, item, param) => {
                const o = superFetchHook.valueHandlers['ifBranch'];
                const v1 = superFetchHook.fetchActionHelper.getVar(item['v1'], param);
                const compareType = item.compareType, compareFn = o.compareFn[compareType];
                const v2 = superFetchHook.fetchActionHelper.getVar(item['v2'], param);
                const valFn = o.valueType[item.valueType];
                const r = o.noType.has(compareType) ? compareFn(v1, v2, item) : compareFn(valFn(v1), valFn(v2), item);
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
            show: superFetchHook.simpleValueHandlerHelper.buildFieldRender({
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    v1: {
                        type: 'text'
                    },
                    compareType: {
                        type: 'select',
                        getOptions(v) {
                            const o = superFetchHook.valueHandlers['ifBranch'];
                            return buildOption(Object.keys(o.compareFn).map(v => [v, superFetchHook.mapTitle[v]]), v, 0, 1)
                        },
                    },
                    v2: {
                        type: 'text'
                    },
                    regPattern: {
                        type: 'text'
                    },
                    valueType: {
                        type: 'select',
                        getOptions(v) {
                            const o = superFetchHook.valueHandlers['ifBranch'];
                            return buildOption(Object.keys(o.valueType).map(v => [v, lang(v)]), v, 0, 1);
                        }
                    },
                    rangeHandle: {
                        type: 'text',
                        afterInsertDoc(el) {
                            el.value = el.parentElement.querySelector('.fetch-replacement-target').value;
                        },
                        attrs: {
                            className: 'hidden',
                        }
                    }
                }
            }),
        },
        elseif: {
            async fn(value, item, param) {
                return await superFetchHook.valueHandlers.ifBranch.handlers.if.ifFn(value, item, param)
            },
            show: (li, vars) => {
                superFetchHook.valueHandlers.ifBranch.handlers.if.show(li, vars);
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
                        attrs: {
                            className: 'hidden',
                            value: 'else',
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
        breaks: {
            fn: (value, item, param) => (item.break = true, param.break = true, value),
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

    superFetchHook.hookLang({
        commandPath: '程序路径,可使用{变量}',
        arguments: '参数,可使用{变量},默认格式同常见shell命令行字符串参数',
        argvUseVariable: '参数使用一个变量',
        returnPid: '返回pid',
    });
    superFetchHook.simpleValueHandlerHelper.addHandlers('executeCmd', {
        haveReturn: {
            fn: async (value, item, param) => {
                const req = superFetchHook.valueHandlers.executeCmd.req;
                const r = await req({
                    cmd: superFetchHook.fetchActionHelper.replaceVars2Format(param.vars, item.commandPath),
                    args: item.argvUseVariable ?
                        superFetchHook.fetchActionHelper.getVar(item.arguments, param, true) :
                        shellQuote.parse(superFetchHook.fetchActionHelper.replaceVars2Format(param.vars, item.arguments))
                }, 'cmd');
                return r.response;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    commandPath: {
                        type: 'text',
                        width: '5vw',
                    },
                    arguments: {
                        type: 'text',
                        width: '6vw',
                    },
                    argvUseVariable: {
                        type: 'checkbox'
                    }
                }
            },
        },
        cmdNoReturn: {
            async fn(value, item, param) {
                const req = superFetchHook.valueHandlers.executeCmd.req;
                const argv = {
                    res: 0,
                    cmd: superFetchHook.fetchActionHelper.replaceVars2Format(param.vars, item.commandPath),
                    args: item.argvUseVariable ?
                        superFetchHook.fetchActionHelper.getVar(item.arguments, param, true) :
                        shellQuote.parse(superFetchHook.fetchActionHelper.replaceVars2Format(param.vars, item.arguments))
                }
                if (item.returnPid) {
                    argv.getPid = 1;
                    const r = await req(argv, 'cmd');
                    return r.response;
                }
                req(argv, 'cmd');
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    commandPath: {
                        type: 'text',
                        width: '5vw',
                    },
                    arguments: {
                        type: 'text',
                        width: '5vw',
                    },
                    argvUseVariable: {
                        type: 'checkbox'
                    },
                    returnPid: {
                        type: 'checkbox'
                    }
                }
            },
        },
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
            fn: (val, item, param) => superFetchHook.fetchActionHelper.getVar(item.valueExpression, param, true),
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    valueExpression: {
                        type: 'text',
                        width: '10vw',
                    },
                }
            }
        },
        setValue: {
            fn(_, item, param) {
                const v = superFetchHook.valueHandlers.valueRelation.buildValue(item, param);
                const [name, g] = item.leftValue.split('|');
                const m = {g: param.globalVars, p: param.parentVars};
                const vars = m?.[g] ?? param.vars;
                if (!name) {
                    return v;
                }
                const names = name.split('.').map(vv => getValue(param.vars, vv, vv, true)).join('.')
                setMapVal(names, v, vars);
                return param.vars[param.rule['super-fetch-name']];
            },
            show: superFetchHook.simpleValueHandlerHelper.buildFieldRender({
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    leftValue: {
                        type: 'text',
                        width: '5vw',
                    },
                    variableType: {
                        type: 'select',
                        getOptions(val) {
                            const va = superFetchHook.valueHandlers.valueRelation;
                            return buildOption(Object.keys(va.valueType).map(v => [
                                v, lang(v), `title="${superFetchHook.mapTitle?.[v + '-desc'] ? lang(v + '-desc') : lang(v)}"`
                            ]), val, 0, 1, 2);
                        }
                    },
                    rightValue: {
                        type: 'text',
                        width: '5vw',
                    },
                }
            })
        },
        deleteVariable: {
            fn(value, item, param) {
                let [express, scope] = item.varName.split('|');
                const s = {g: param.globalVars, p: param.parentVars};
                const varsMap = s[scope] ?? param.vars;
                express = superFetchHook.fetchActionHelper.replaceVars2Format(param.vars, express);
                const arr = express.split('.');
                let n = '', o = varsMap;
                while (true) {
                    n = arr.shift();
                    if (!o.hasOwnProperty(n)) {
                        break;
                    }
                    if (arr.length < 1) {
                        delete o[n];
                        break;
                    }
                    o = o[n];
                }
                return param.vars[item.currentVarName];
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    varName: {
                        type: 'text',
                    }
                }
            }
        },
        arrayUnshift: {
            fn(_, item, param) {
                const v = superFetchHook.valueHandlers.valueRelation.buildValue(item, param);
                const arr = superFetchHook.fetchActionHelper.getVar(item.leftValue, param, true);
                arr.unshift(v);
                return _;
            },
            show(li, vars) {
                superFetchHook.valueHandlers.valueRelation.handlers.setValue.show(li, vars);
            },
        },
        pushArrayValue: {
            fn(_, item, param) {
                const v = superFetchHook.valueHandlers.valueRelation.buildValue(item, param);
                const arr = superFetchHook.fetchActionHelper.getVar(item.leftValue, param, true);
                arr.push(v);
                return _;
            },
            show(li, vars) {
                superFetchHook.valueHandlers.valueRelation.handlers.setValue.show(li, vars);
            },
        },
        pushArrayArray: {
            fn(_, item, param) {
                const v = superFetchHook.fetchActionHelper.getVar(item.rightValue, param, true);
                const arr = superFetchHook.fetchActionHelper.getVar(item.leftValue, param, true);
                arr.push(...v);
                return _;
            },
            show(li, vars) {
                superFetchHook.valueHandlers.valueRelation.handlers.setValue.show(li, vars);
                li.querySelector('.variableType').remove();
            },
        },
        toNumber: {
            fn: Number,
            param: {
                mountElementSelector: '.fetch-replacement-target',
            }
        },
        str2Array: {
            fn: (s, item) => Array.isArray(s) ? s : s.split(item.separator),
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    separator: {
                        type: 'text',
                        width: '7vw',
                    },
                }
            }
        },
        o2Array: {
            fn: arr => [...arr],
            param: {
                mountElementSelector: '.fetch-replacement-target',
            }
        },
        toArrays: {
            fn: arr => [arr],
            param: {
                mountElementSelector: '.fetch-replacement-target',
            }
        },
        array2str: {
            fn: (arr, item) => arr.join(item.separator),
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    separator: {
                        type: 'text',
                        width: '7vw',
                    },
                }
            }
        },
    }, {
        buildValue(item, param) {
            const value = item.rightValue;
            return this.valueType[item.variableType](value, param.vars, param);
        },

        valueType: {
            variable: (value, vars, param) => superFetchHook.fetchActionHelper.getVar(value, param, true),
            ...superFetchHook.valueHandlers.ifBranch.valueType,
            func: (v, vars) => {
                let [fn, param] = v.split('|');
                if (superFetchHook.fetchActionHelper.reg.test(fn)) {
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
            eval(express, vars, dest = globalThis) {
                const keys = Object.keys(vars);
                const hasValue = {};
                iterateObjByKey(vars, (k, v) => {
                    if (dest.hasOwnProperty(k)) {
                        hasValue[k] = dest[k];
                    }
                    dest[k] = v;
                }, false);
                const r = eval(createScript(express));
                for (const key of keys) {
                    if (hasValue.hasOwnProperty(key)) {
                        dest[key] = hasValue[key];
                    } else {
                        delete dest[key];
                    }
                }
                return r;
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
                    if ('string' === typeof v) {
                        const vv = getValue(vars, v, v, true);
                        if (v !== vv) {
                            o[k] = vv;
                        }
                    }
                    const kk = superFetchHook.fetchActionHelper.replaceVars2Format(vars, k);
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