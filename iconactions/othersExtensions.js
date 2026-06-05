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
                const fn = superFetchHook.fetchActionHelper.extractHandlers(param);
                param.interval = setInterval(async () => {
                    value = await fn(value, item, param);
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
        'actionNames': '执行的操作名',
        'shareVars': '共享当前操作的符号表',
        'async': '异步执行',
    });
    superFetchHook.valueHandlers.executeActions = {
        async handle(item, value, param) {
            await superFetchHook.executeActions(...item?.actionNames, item.shareVars ? param.vars : {}, item.async);
            if (item.async || !item.shareVars) {
                return value
            }
            return param.vars[param.rule['super-fetch-name']]
        },
        form(li, datum) {
            datum.actionNames = $(li.querySelector('.actionNames')).val();
        },
        afterRender: [],
        renderHook(li, vars, ev) {
            this.renderHookX(li, vars);
            const fn = () => {
                vars.actionNames = vars.actionNames ? vars.actionNames : [];
                const select = li.querySelector('.actionNames');
                const select2 = $(select);
                select2.select2({
                    placeholder: lang('actionNames'),
                    data: (() => {
                        const arr = getAnkiFetchParams().filterAndMapX(item => {
                            const name = item['fetch-name']
                            if (vars.actionNames.includes(name)) {
                                return false
                            }
                            return {
                                id: name,
                                text: name
                            }
                        });
                        arr.push(...vars.actionNames.map(name => ({
                            id: name,
                            text: name
                        })));
                        return arr;
                    })(),
                    multiple: true,
                    allowClear: true,
                    tags: true,
                });
                select2.on('select2:select', evt => {
                    const val = select2.val(), name = evt.params.data.id;
                    val.push(name);
                    const o = evt.params.data.element;
                    const option = new Option(name, name, true, true);
                    o.remove();
                    select2.append(option);
                    select2.val(val).trigger('change');
                });
                select2.val(vars.actionNames).trigger('change');
            };
            ev ? fn() : this.afterRender.push(fn);
        },
        renderHookX: superFetchHook.simpleValueHandlerHelper.buildFieldRender({
            mountElementSelector: '.handleType',
            fields: {
                actionNames: {
                    type: 'select',

                    attrs: {
                        className: 'actionNames', multiple: 'multiple'
                    }
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
        'simpleWatcher': '简单watcher',
        'urlWatcher': 'url变化',
        'querySelector': '选择器或者元素的变量名',
        'subtree': 'subtree 监听元素的整个子树属性变化',
        'childList': 'childList 元素发生的节点的新增与删除',
        'attributes': 'attributes 节点属性值的变化',
        'elementObserve': '元素监听',
        'observe-desc': '将执行此项后面对值处理的所有操作',
        'disconnectObserve': '元素停止监听',
        'urlWatcherName': 'watcher名,用于结束监听',
        'cancelUrlWatcher': '取消Url监听',
        'elementObserveName': 'observe名称，用于取消observe',
    });
    superFetchHook.simpleValueHandlerHelper.addHandlers('simpleWatcher', {
        urlWatcher: {
            fn(value, item, param) {
                const fn = superFetchHook.fetchActionHelper.extractHandlers(param);
                const urlWatcher = async e => {
                    param.vars.navigateEvt = e;
                    value = await fn(value);
                };
                setMapVal(`urlWatcher.${item.urlWatcherName}`, urlWatcher, window);
                navigation.addEventListener("navigate", urlWatcher);
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    urlWatcherName: {
                        type: 'text',
                        width: '7vw'
                    }
                }
            }
        },
        cancelUrlWatcher: {
            fn(value, item) {
                const watcher = superFetchHook.getVarVal(window, `urlWatcher.${item.urlWatcherName}`);
                watcher && Navigaion.removeEventListener('navigate', watcher);
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    urlWatcherName: {
                        type: 'text',
                        width: '7vw'
                    }
                }
            },
        },

        elementObserve: {
            fn(value, item, param) {
                const fn = superFetchHook.fetchActionHelper.extractHandlers(param);
                const selector = superFetchHook.getVariable(param.vars, item.querySelector, item.querySelector, true);
                const ele = selector instanceof Element ? selector : document.querySelector(selector);
                if (!ele) {
                    console.log("can't parse element")
                    return value;
                }
                const observer = new MutationObserver(async (mutationList) => {
                    param.vars.mutationRecord = mutationList;
                    value = await fn(value);
                });
                setMapVal(`elementObserve.${item.elementObserveName}`, observer, window);
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
                    elementObserveName: {
                        type: 'text',
                        width: '4vw',
                    },
                    querySelector: {
                        type: 'text',
                        width: '5vw',
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
            fn(value, item) {
                superFetchHook.getVarVal(window, `elementObserve.${item.elementObserveName}`)?.disconnect?.();
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    elementObserveName: {
                        type: 'text',
                        width: '5vw',
                    },
                }
            }
        }
    }, {scope: {fetch: {fetch: '*'}}});

    superFetchHook.hookLang({
        'handleMenu': 'tampermonkey菜单',
        'addMenu': '添加菜单',
        'addMenu-desc': '此项后面的操作为点击菜单的操作',
        'removeMenu': '删除菜单',
        'menuTitle': '菜单标题,可使用{变量}',
        'accessKey': '快捷键，可选',
    });
    superFetchHook.simpleValueHandlerHelper.addHandlers('handleMenu', {
        addMenu: {
            fn(value, item, param) {
                const fn = superFetchHook.fetchActionHelper.extractHandlers(param);
                const menu = superFetchHook.fetchActionHelper.replaceVars2Format(param.vars, item.menuTitle);
                window.userJSMenu[menu] = GM_registerMenuCommand(menu, async () => {
                    value = await fn(value, item, param);
                }, item.accessKey);
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    menuTitle: {
                        type: 'text',
                        width: '7vw',
                        attrs: {required: 'required'}
                    },
                    accessKey: {
                        type: 'text',
                        width: '4vw',
                    }
                }
            }
        },
        removeMenu: {
            fn(value, item, param) {
                GM_unregisterMenuCommand(window.userJSMenu[superFetchHook.fetchActionHelper.replaceVars2Format(param.vars, item.menuTitle)]);
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    menuTitle: {
                        type: 'text',
                        width: '8vw',
                        attrs: {required: 'required'}
                    },
                }
            }
        },
    }, {scope: {fetch: {fetch: '*'}}});

    superFetchHook.hookLang({
        foreach: '循环遍历',
        iterator: '循环的变量',
        iteratorElement: '循环子变量',
        breakforof: '中断forof',
    })
    superFetchHook.simpleValueHandlerHelper.addHandlers('foreach', {
        forof: {
            async fn(value, item, param) {
                const iterator = superFetchHook.getVariable(param.vars, item.iterator);
                const arr = ['forof'], identifier = new Set(['forof', 'endforof']), handlers = [];
                const h = [];
                while (true) {
                    const handler = param.handlers.shift();
                    if (!handler) {
                        break;
                    }
                    if (!identifier.has(handler?.rangeHandle)) {
                        h.push(handler);
                        continue;
                    }
                    if (arr[arr.length - 1] === 'forof' && handler.rangeHandle === 'endforof') {
                        handlers.push([...h]);
                        h.splice(0);
                        arr.pop();
                        if (arr.length < 1) {
                            break;
                        }
                        continue;
                    }
                    arr.push(handler.rangeHandle);
                }
                const fn = handlers.reverse().reduce((prev, cur) => {
                    cur.push(prev);
                    return superFetchHook.fetchActionHelper.buildHandlers(cur, param);
                }, v => v);

                for (const iteratorElement of iterator) {
                    param.vars[item.iteratorElement] = iteratorElement;
                    value = await fn(value);
                    if (param?.breakforof) {
                        delete param.breakforof;
                        break;
                    }
                }
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    iterator: {
                        type: 'text',
                        width: '4vw',
                    },
                    iteratorElement: {
                        type: 'text',
                        width: '4vw',
                    },
                    rangeHandle: {
                        type: 'text',
                        hook: el => el.value = 'forof',
                        attrs: {
                            className: 'hidden',
                        }
                    }
                }
            }
        },
        breakforof: {
            fn(value, item, param) {
                param.breakforof = true;
                item.break = true;
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    rangeHandle: {
                        type: 'text',
                        hook: el => el.value = 'breakforof',
                        attrs: {
                            className: 'hidden',
                        }
                    }
                }
            }
        },
        endforof: {
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    rangeHandle: {
                        type: 'text',
                        hook: el => el.value = 'endforof',
                        attrs: {
                            className: 'hidden',
                        }
                    }
                }
            }
        }
    }, {scope: {fetch: {fetch: '*'}}});

    superFetchHook.hookLang({
        'simpleEvent': '事件处理',
        'eventIdentifier': '事件名，用于后续取消或其它操作',
        'event': '事件',
        'bindEventElement': '绑定的元素，可为选择器或者元素变量',
    });

    superFetchHook.simpleValueHandlerHelper.addHandlers('simpleEvent', {
        addEvent: {
            fn(value, item, param) {

            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    eventIdentifier: {
                        type: 'text',
                        width: '5vw'
                    },
                    bindEventElement: {
                        type: 'text',
                        width: '5vw'
                    },
                    event: {
                        type: 'select',
                        getOptions(val) {
                            return buildOption([], val)
                        }
                    }
                }
            }
        }
    }, {scope: {fetch: {fetch: '*'}}});

})();