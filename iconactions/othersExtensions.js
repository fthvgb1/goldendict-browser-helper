;(() => {
    superFetchHook.hookLang({
        'displacement': '位运算',
        'leftDisplacement': '<<',
        'rightDisplacement': '>>',
        'log': '打印到控制台',
        'log-desc': '可使用{变量},{$vars}为所有变量，为空打印当前变量',
        'trim': '去除两边看不见字符',
    });
    const lang = superFetchHook.lang;
    const calculator = superFetchHook.valueHandlers.simpleCalculator;
    calculator.displacementOperate = {
        leftDisplacement: (num1, num2) => num1 << num2,
        rightDisplacement: (num1, num2) => num1 >> num2,
    };
    calculator.handlers.displacement = {
        ...calculator.handlers.calculator,
        fn(value, item, param) {
            const num = 'variable' === item.operatedTarget ? superFetchHook.getVariable(param.vars, item.operatedNumber, 0) : Number(item.operatedNumber);
            return calculator.displacementOperate[item.operator](Number(value), num)
        },
        text: lang('displacement'),
        param: {
            ...calculator.handlers.calculator.param,
            fields: {
                ...calculator.handlers.calculator.param.fields,
                operator: {
                    ...calculator.handlers.calculator.param.fields.operator,
                    diffSelector: '[name=operator]:has(option[name=leftDisplacement])',
                    getOptions(val) {
                        const o = Object.keys(calculator.displacementOperate)
                            .map(k => [k, superFetchHook.mapTitle[k] ?? k]);
                        return buildOption(o, val, 0, 1)
                    }
                }
            },
        },
    };


    superFetchHook.valueHandlers.log = {
        reg: /\{(.*?)}/g,
        handle(item, value, eleParam) {
            const express = item.searchValue;
            if (!express) {
                console.log(value);
                return value
            }
            const vars = eleParam?.vars ?? {};
            if (Object.keys(vars).length < 1) {
                vars['value'] = value;
            }
            const arr = [];
            let r, i = 0;
            while ((r = this.reg.exec(express)) !== null) {
                arr.push(express.slice(i, r.index));
                i = r.index + r[0].length;
                const v = '$vars' === r[1] ? vars : superFetchHook.getVariable(vars, r[1], r[0]);
                arr.push(v);
            }
            i < express.length && arr.push(express.slice(i));
            console.log(...arr);
            return value;
        },
        renderHook(li) {
            li.querySelectorAll('[name=searchValue] ~:not(button)').forEach(el => el.classList.add('hidden'));
            const input = li.querySelector('[name=searchValue]');
            input.style.width = '20vw';
            input.title = lang('log-desc');
        }
    }

    superFetchHook.valueHandlers.simpleValueHandlers.handlers.trim = s => s.trim();


    superFetchHook.hookLang({
        typeKeys: '输入快捷键',
        'typeKeys-desc': '组合键用空格隔开，多组用,逗号隔开',
        'simpleType': '简单输入快捷键',
        'simpleType-desc': '替换即为快捷键',
        'typeCopyType': '输入所快捷键扣复制，然后再输入快捷键',
        'typeCopyType-desc': '替换项为前一个快捷键，pattern项为后一个快捷键',
        'delay': '延时执行',
        'delayOrInterval': '延时或超时执行',
        'delayTime': '延时时间',
        'delayTime-desc': '延时时间,单位毫秒',
        'interval': '定时执行',
        'interval-desc': '定时执行此项后面对值处理的所有操作',
        'intervalTime-desc': '定时时间，单位毫秒',
        'clearInterval': '停止前一个定时器',
    });
    superFetchHook.simpleValueHandlerHelper.addHandlers('typeKeys', {
        simpleType: {
            fn(value, item) {
                request('keys=' + parseKey(item.replaceValue));
                return value;
            },
            showInput: 'replaceValue',
        },
        typeCopyType: {
            fn(value, item) {
                request({
                    prev: parseKey(item.replaceValue),
                    next: parseKey(item.pattern),
                }, 'aca')
                return value;
            },
            showInput: 'replaceValue,pattern',
        }
    }, {scope: {fetch: {fetch: '*'}},})

    superFetchHook.simpleValueHandlerHelper.addHandlers('delayOrInterval', {
        delay: {
            async fn(value, item) {
                const timber = time => new Promise(resolve => setTimeout(resolve, time));
                await timber(item.delayTime);
                return value
            },
            param: {
                fields: {
                    delayTime: {
                        type: 'number',
                        width: '7vw',
                    },
                },
                mountElementSelector: '.fetch-replacement-target',
            }
        },
        interval: {
            fn(value, item, param) {
                const handlers = param.handlers.splice(0);
                param.interval = setInterval(async () => {
                    value = await superFetchHook.fetchActionHelper.handItems(handlers, value, param);
                }, item.intervalTime);
                return value;
            },
            param: {
                fields: {
                    intervalTime: {
                        type: 'number',
                        width: '7vw',
                    },
                },
                mountElementSelector: '.fetch-replacement-target',
            }
        },
        clearInterval: {
            fn(value, item, param) {
                param.interval && clearInterval(param.interval);
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
            }
        }
    }, {scope: {fetch: {fetch: '*'}}});


    superFetchHook.hookLang({
        'executeActions': '执行操作',
        'actionNames': '执行的操作名，多个用,逗号隔开',
        'shareVars': '共享当前操作的符号表',
        'async': '异步执行',
    });
    superFetchHook.valueHandlers.executeActions = {
        async handle(item, value, param) {
            await superFetchHook.executeActions(...item?.actionNames.split(','), item.shareVars ? param.vars : {}, item.async);
            if (item.async || !item.shareVars) {
                return value
            }
            return param.vars[param.rule['super-fetch-name']]
        },
        renderHook: superFetchHook.simpleValueHandlerHelper.buildFieldRender({
            mountElementSelector: '.handleType',
            fields: {
                actionNames: {
                    type: 'text'
                },
                shareVars: {
                    type: 'checkbox'
                },
                async: {
                    type: 'checkbox',
                }
            }
        }),
        scope: {fetch: {fetch: '*'}},
    }

    superFetchHook.hookLang({
        'simpleElementWatcher': '简单元素变化监听',
        'querySelector': '选择器或者元素的变量名',
        'subtree': 'subtree 监听元素的整个子树属性变化',
        'childList': 'childList 元素发生的节点的新增与删除',
        'attributes': 'attributes 节点属性值的变化',
        'observe': '开始监听',
        'observe-desc': '将执行此项后面对值处理的所有操作',
        'disconnectObserve': '停止监听',
    });
    superFetchHook.simpleValueHandlerHelper.addHandlers('simpleElementWatcher', {
        observe: {
            fn(value, item, param) {
                const handlers = param.handlers.splice(0);
                const selector = superFetchHook.getVariable(param.vars, item.querySelector, item.querySelector, true);
                const ele = selector instanceof Element ? selector : document.querySelector(selector);
                if (!ele) {
                    console.log("can't parse element")
                    return value;
                }
                const observer = new MutationObserver(async (mutationList) => {
                    param.vars.mutationRecord = mutationList;
                    value = await superFetchHook.fetchActionHelper.handItems(handlers, value, param);
                });
                param.observer = observer;
                observer.observe(ele, {
                    subtree: item.subtree,
                    childList: item.childList,
                    attributes: item.attributes,
                });
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    querySelector: {
                        type: 'text',
                        width: '8vw',
                    },
                    subtree: {
                        type: 'checkbox'
                    },
                    childList: {
                        type: 'checkbox',
                    },
                    attributes: {
                        type: 'checkbox',
                    }
                }
            }
        },
        disconnectObserve: {
            fn(value, item, param) {
                param?.observer && param.observer.disconnect();
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
            }
        }
    }, {scope: {fetch: {fetch: '*'}}});
    // todo observe element and add event
    //superFetchHook.valueHandlers.addevent = {};

})();