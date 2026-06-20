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
                const v = '$vars' === r[1] ? vars : superFetchHook.getVariable(vars, r[1], undefined);
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
        'simpleType': '输入快捷键',
        'simpleTypeKeys': '快捷键,组合使用时用空格隔开，多组用,逗号隔开',
        'typeCopyType': '先输入一次快捷键后复制，然后再输入一次快捷键',
        'afterCopyType': '复制后输入的快捷键',
        'delay': '延时执行sleep',
        'delayOrInterval': '延时或定时执行',
        'time-desc': '时间,单位毫秒',
        'setTimeout': '单次定时器setTimeout',
        'setTimeoutEnd': '结束setTimeout作用域',
        'clearTimeout': '停止单次定时器clearTimeout',
        'interval': '定时执行setInterval',
        'interval-desc': '定时执行此项后面对值处理的所有操作',
        'intervalName': '定时标识，用于清除该定时器',
        'intervalTime-desc': '定时时间，单位毫秒',
        'clearInterval': '停止定时器clearInterval',
        'timeoutName': 'setTimeout标识符，用于clearSetTimeout',
    });
    superFetchHook.simpleValueHandlerHelper.addHandlers('typeKeys', {
        simpleType: {
            fn(value, item) {
                request('keys=' + parseKey(item.keys));
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    keys: {
                        title: lang('simpleTypeKeys'),
                        type: 'text',
                        width: '13vw',
                    }
                }
            }
        },
        typeCopyType: {
            fn(value, item) {
                request({
                    prev: parseKey(item.keys),
                    next: parseKey(item.afterCopyType),
                }, 'aca')
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    keys: {
                        title: lang('simpleTypeKeys'),
                        type: 'text',
                        width: '6.4vw',

                    },
                    afterCopyType: {
                        type: 'text',
                        width: '6.4vw',
                    }
                }
            }
        }
    });

    superFetchHook.simpleValueHandlerHelper.addHandlers('delayOrInterval', {
        delay: {
            async fn(value, item) {
                const sleeper = time => new Promise(resolve => setTimeout(resolve, time));
                await sleeper(item.delayTime);
                return value
            },
            param: {
                fields: {
                    delayTime: {
                        title: lang('time-desc'),
                        type: 'number',
                        width: '7vw',
                    },
                },
                mountElementSelector: '.fetch-replacement-target',
            }
        },
        setTimeout: {
            fn(value, item, param) {
                const fn = superFetchHook.fetchActionHelper.extractHandlers(param, ['setTimeoutStart', 'setTimeoutEnd']);
                const t = setTimeout(async () => {
                    value = await fn(value, item, param);
                    clearTimeout(t);
                }, item.time);
                param.vars[item.identifier] = t;
                return param.vars[item.currentVarName];
            },
            param: {
                fields: {
                    identifier: {
                        title: lang('timeoutName'),
                        type: 'text',
                        width: '5vw',
                    },
                    time: {
                        title: lang('time-desc'),
                        type: 'number',
                        width: '7vw',
                    },
                    rangeHandle: {
                        type: 'text',
                        attrs: {
                            className: 'hidden',
                            value: 'setTimeoutStart',
                        }
                    }
                },
                mountElementSelector: '.fetch-replacement-target',
            }
        },
        clearTimeout: {
            fn(value, item, param) {
                clearTimeout(param.vars[item.identifier]);
                return value
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    identifier: {
                        title: lang('timeoutName'),
                        type: 'text',
                        width: '5vw',
                    },
                },
            }
        },
        setTimeoutEnd: {
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    rangeHandle: {
                        type: 'text',
                        attrs: {
                            className: 'hidden',
                            value: 'setTimeoutEnd',
                        }
                    }
                },
            }
        },
        interval: {
            fn(value, item, param) {
                const fn = superFetchHook.fetchActionHelper.extractHandlers(param);
                param.vars[item.intervalName] = setInterval(async () => {
                    value = await fn(value, item, param);
                }, item.intervalTime);
                return value;
            },
            param: {
                fields: {
                    intervalName: {
                        type: 'text',
                        width: '5vw',
                    },
                    intervalTime: {
                        title: lang('time-desc'),
                        type: 'number',
                        width: '7vw',
                    },
                },
                mountElementSelector: '.fetch-replacement-target',
            }
        },
        clearInterval: {
            fn(value, item, param) {
                param.vars[item.intervalName] && clearInterval(param.vars[item.intervalName]);
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    intervalName: {
                        type: 'text',
                        width: '5vw',
                    }
                },
            }
        }
    }, {scope: {fetch: {fetch: '*'}}});


    superFetchHook.hookLang({
        'executeActions': '执行操作',
        'actionNames': '执行的操作名',
        'shareVars': '共享符号表',
        'useSeparateVars': '使用独立的符号表',
        'copyVars': '复制符号表',
        'async': '异步执行',
    });
    superFetchHook.valueHandlers.executeActions = {
        async handle(item, value, param) {
            const vars = this.varsType[item.varsType](param.vars);
            await superFetchHook.executeActions(...item?.actionNames, vars, item.async);
            if (item.async || item.useSeparateVars) {
                return value
            }
            return param.vars[param.rule['super-fetch-name']]
        },
        form(li, datum) {
            datum.actionNames = $(li.querySelector('.actionNames')).val();
        },
        varsType: {
            shareVars: vars => vars,
            useSeparateVars: () => {
            },
            copyVars: vars => ({...vars})
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
            (ev || vars?.['$clone']) ? fn() : this.afterRender.push(fn);
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
                varsType: {
                    type: 'select',
                    getOptions(v) {
                        const keys = Object.keys(superFetchHook.valueHandlers.executeActions.varsType)
                            .map(k => [k, lang(k)])
                        ;
                        return buildOption(keys, v, 0, 1);
                    },
                    width: '3vw'
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
        iterator: '要循环的变量名',
        iteratorElement: '循环时子变量名',
        breakforof: '中断for,forof,while(true)和遍历对象',
        iteratorVariable: '循环时使用的变量名',
        startNumber: '开始的数',
        handleTypeOperator: '循环时比较操作',
        iteratorNumber: '要循环的数或变量名',
        useVariable: '使用变量',
        addNumber: '每次循环时增减量',
        iterateObject: '遍历对象',
        endIterateObject: '结束遍历对象',
        objectKey: '对象键名，用于后续访问',
        objectValue: '对象值名,用于后续访问',
        objectName: '要遍历的对象名',
    })
    superFetchHook.simpleValueHandlerHelper.addHandlers('foreach', {
        for: {
            async fn(value, item, param) {
                const iterator = item.useVariable ? superFetchHook.fetchActionHelper.getVar(item.iterator, param, true) : item.iterator;
                const fn = superFetchHook.fetchActionHelper.extractHandlers(param, ['for', 'endfor']);
                for (let i = item.start; superFetchHook.valueHandlers.foreach.handlers.for.operate[item.handleTypeOperator](i, iterator); i += item.addNumber) {
                    param.vars[item.iteratorVariable] = i;
                    value = await fn(value);
                    if (param?.breakforof) {
                        delete param.breakforof;
                        break;
                    }
                }
                return value;
            },
            operate: {
                '>': (i, v) => i > v,
                '>=': (i, v) => i >= v,
                '<': (i, v) => i < v,
                '<=': (i, v) => i <= v,
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    iteratorVariable: {
                        type: 'text',
                        width: '5vw',
                    },
                    start: {
                        title: lang('startNumber'),
                        type: 'number',
                        width: '4vw',
                    },
                    handleTypeOperator: {
                        type: 'select',
                        getOptions(value) {
                            return buildOption(['>', '>=', '<', '<='], value);
                        },
                        width: '4vw',
                    },
                    iterator: {
                        title: lang('iteratorNumber'),
                        type: 'text',
                        width: '5vw',
                    },
                    useVariable: {
                        type: 'checkbox',
                        afterInsertDoc(el, v) {
                            el.previousElementSibling.type = v ? 'text' : 'number';
                        },
                        attrs: {
                            onchange: ev => ev.target.previousElementSibling.type = ev.target.checked ? 'text' : 'number'
                        }
                    },
                    addNumber: {
                        type: 'number',
                        width: '4vw',
                    },
                    rangeHandle: {
                        type: 'text',
                        attrs: {
                            className: 'hidden needStretch',
                            value: 'for',
                        }
                    },
                }
            }
        },

        endfor: {
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    rangeHandle: {
                        type: 'text',
                        attrs: {
                            className: 'hidden',
                            value: 'endfor',
                        }
                    }
                }
            }
        },

        forof: {
            async fn(value, item, param) {
                const iterator = superFetchHook.getVariable(param.vars, item.iterator);
                const fn = superFetchHook.fetchActionHelper.extractHandlers(param, ['forof', 'endforof']);
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
                        attrs: {
                            className: 'hidden',
                            value: 'forof',
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
                        attrs: {
                            className: 'hidden',
                            value: 'endforof',
                        }
                    }
                }
            }
        },
        'while(true)': {
            async fn(value, item, param) {
                const fn = superFetchHook.fetchActionHelper.extractHandlers(param, ['while', 'endwhile']);
                while (true) {
                    value = await fn(value, item, param);
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
                    rangeHandle: {
                        type: 'text',
                        attrs: {
                            className: 'hidden',
                            value: 'while',
                        }
                    }
                }
            }
        },
        endwhile: {
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    rangeHandle: {
                        type: 'text',
                        attrs: {
                            className: 'hidden',
                            value: 'endwhile',
                        }
                    }
                }
            }
        },
        iterateObject: {
            async fn(value, item, param) {
                const fn = superFetchHook.fetchActionHelper.extractHandlers(param, ['iterateObject', 'endIterateObject']);
                const o = superFetchHook.fetchActionHelper.getVar(item.object, param, true);
                for (const [k, v] of Object.entries(o)) {
                    param.vars[item.key] = k;
                    param.vars[item.value] = v;
                    value = await fn(value, item, param);
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
                    object: {
                        title: lang("objectName"),
                        type: 'text',
                        width: '3.9vw',
                    },
                    key: {
                        title: lang("objectKey"),
                        type: 'text',
                        width: '4vw',
                    },
                    value: {
                        title: lang("objectValue"),
                        type: 'text',
                        width: '4vw',
                    },
                    rangeHandle: {
                        type: 'text',
                        attrs: {
                            className: 'hidden',
                            value: 'iterateObject',
                        }
                    }
                }
            }
        },
        endIterateObject: {
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    rangeHandle: {
                        type: 'text',
                        attrs: {
                            className: 'hidden',
                            value: 'endIterateObject',
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
                        attrs: {
                            className: 'hidden',
                            value: 'breakforof',
                        }
                    }
                }
            }
        },
    }, {scope: {fetch: {fetch: '*'}}});

    superFetchHook.hookLang({
        'simpleEvent': '事件处理',
        'eventIdentifier': '事件标识，用于后续移除或其它操作',
        'event': '事件',
        'bindEventElement': '事件作用到的元素的选择器,相当于jquery的$.on()',
        'addEvent': '添加事件',
        'removeEvent': '移除事件',
        'specificEvent': '要添加的事件名,可手动添加没有在列表中的事件',
        'preventDefault': '阻止默认行为 preventDefault',
        'stopPropagation': '阻止事件继续传播 stopPropagation',
        'stopImmediatePropagation': '阻止除自身外的事件继续传播 stopImmediatePropagation',
        'mouseEvent': '鼠标事件',
        'click': '鼠标单击 click',
        'mousedown': '鼠标按下 mousedown',
        'mouseup': '鼠标松开 mouseup',
        'dblclick': '鼠标双击 dblclick',
        'contextmenu': '鼠标菜单键(通常为右键) contextmenu',
        'mouseenter': '鼠标进入 mouseenter',
        'mouseout': '鼠标移出(会冒泡) mouseout',
        'mouseleave': '鼠标移出(不会冒泡) mouseleave',
        'mousemove': '鼠标移动 mousemove',
        'mouseover': '鼠标在元素及子元素上 mouseover',
        'useCapture': '事件注册在捕获阶段 useCapture',
        'executeOnce': '事件只执行一次，后自动注销 once',
        'non-preventDefault': '忽略阻止默认行为 passive',
        'endEventScope': '结束事件作用作用域'
    });

    superFetchHook.simpleValueHandlerHelper.addHandlers('simpleEvent', {
        addEvent: {
            fn(value, item, param) {
                const ele = superFetchHook.getVariable(param.vars, item.elementVarName ? item.elementVarName : param.rule['super-fetch-name']);
                const handle = superFetchHook.fetchActionHelper.extractHandlers(param, ['startEvenScopet', 'endEventScope']);
                const eventIdentifier = superFetchHook.fetchActionHelper.replaceVars2Format(param.vars, item.eventIdentifier);
                const fn = async ev => {
                    if (item.bindEventElement && !ev.target.matches(item.bindEventElement)) {
                        return;
                    }
                    param.vars[item.eventIdentifier] = ev;
                    ['preventDefault', 'stopPropagation', 'stopImmediatePropagation'].forEach(v => item[v] && ev[v]());
                    await handle(value);
                };
                ele.addEventListener(item.event, fn, {
                    capture: item.capture,
                    once: item.once,
                    passive: item.passive
                });
                setMapVal(`$eventManger.${eventIdentifier}`, [ele, item.event, fn], window);
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    rangeHandle: {
                        type: 'text',
                        attrs: {
                            className: 'hidden needStretch',
                            value: 'startEventScope'
                        }
                    },
                    elementVarName: {
                        type: 'text',
                        width: '5vw'
                    },
                    eventIdentifier: {
                        type: 'text',
                        width: '5vw'
                    },
                    bindEventElement: {
                        type: 'text',
                        width: '6vw'
                    },
                    event: {
                        type: 'select',
                        attrs: {
                            className: 'hidden'
                        },
                        getOptions(val) {
                            return buildOption([], val)
                        },
                        afterInsertDoc(select, value) {
                            const select2 = $(select);
                            let selected = false;
                            const data = iterateObjByKey(superFetchHook.valueHandlers.simpleEvent.eventSet, (k, v) => (
                                {
                                    text: lang(k),
                                    children: v.map(name => ({
                                        id: name,
                                        text: lang(name),
                                        selected: (value === name ? (selected = true, true) : false)
                                    }))
                                }
                            ));
                            !selected && (data.unshift({id: value, text: value, selected: true}));
                            data.unshift({id: '',});
                            select2.select2({
                                placeholder: lang('specificEvent'),
                                data: data,
                                allowClear: true,
                                tags: true,
                                width: '13vw',
                            });
                            return select.nextElementSibling
                        }
                    },
                    preventDefault: {
                        type: 'checkbox',
                    },
                    stopPropagation: {
                        type: 'checkbox',
                    },
                    stopImmediatePropagation: {
                        type: 'checkbox',
                    },
                    capture: {
                        title: lang('useCapture'),
                        type: 'checkbox',
                    },
                    once: {
                        title: lang('executeOnce'),
                        type: 'checkbox',
                    },
                    passive: {
                        title: lang('non-preventDefault'),
                        type: 'checkbox',
                    },
                }
            }
        },

        ...(() => {
            const o = {};
            [
                ['removeEvent', (value, item) => {
                    const [ele, eventName, fn] = superFetchHook.getVarVal(window, `$eventManger.${item.eventIdentifier}`, []);
                    if (ele && eventName && fn) {
                        ele.removeEventListener(eventName, fn);
                        delete window['$eventManger'][item.eventIdentifier];
                    }
                    return value
                }], ...['preventDefault', 'stopPropagation', 'stopImmediatePropagation'].map(v => [v]),
            ].forEach(([name, fn]) => o[name] = {
                fn: fn ?? ((value, item, param) => (param.vars?.[item.eventIdentifier]?.[name]?.(), value)),
                param: {
                    mountElementSelector: '.fetch-replacement-target',
                    fields: {
                        eventIdentifier: {
                            type: 'text',
                            width: '11vw'
                        },
                    }
                }
            });
            return o;
        })(),
        endEventScope: {
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    rangeHandle: {
                        type: 'text',
                        attrs: {
                            className: 'hidden',
                            value: 'endEventScope'
                        }
                    },
                }
            }
        }
    }, {
        eventSet: {
            mouseEvent: ['click', 'mousedown', 'mouseup', 'dblclick', 'contextmenu', 'mouseenter', 'mouseout',
                'mouseleave', 'mouseover']
        },
        scope: {fetch: {fetch: '*'}}
    });

    PushHookAnkiHtml(html => {
        const setting = html.querySelector('.select-setting');
        setting.addEventListener('dblclick', evt => {
            if (!evt.target.matches('input[type=text]')) {
                return;
            }
            const i = evt => textarea.value = evt.target.value;
            const input = evt.target;
            const fn = () => {
                input.nextElementSibling.remove();
                input.removeEventListener('input', i);
            }
            if (input.nextElementSibling?.name === input.name) {
                fn(input, input.nextElementSibling);
                return;
            }
            input.addEventListener('input', i);
            const textarea = superFetchHook.templateHelper.createElement('textarea', {
                value: evt.target.value,
                name: evt.target.name,
                className: 'show valueHelper',
                rows: 8,
                cols: 50,
                placeholder: input.placeholder,
                title: input.title,
            });
            evt.target.insertAdjacentElement('afterend', textarea);
            textarea.addEventListener('input', () => input.value = textarea.value)
            textarea.addEventListener('dblclick', fn);
            textarea.focus();
        });
    });

    superFetchHook.hookLang({
        openDiag: '打开anki制卡',
        closeDiag: '关闭anki制卡',
        endScope: '结束作用域',
        makeAnkiCard: 'anki制卡',
        ankiTag: '标签名,多个用,隔开',
        AddTag: '打标签',
    });
    superFetchHook.simpleValueHandlerHelper.addHandlers('makeAnkiCard', {
        openDiag: {
            fn(value, item, param) {
                const fn = superFetchHook.fetchActionHelper.extractHandlers(param, 'endScope');
                PushHookAnkiDidRender(() => fn(value));
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    rangeHandle: {
                        type: 'text',
                        attrs: {
                            className: 'hidden',
                            value: 'openDiag'
                        }
                    },
                }
            }
        },
        closeDiag: {
            fn(value, item, param) {
                const fn = superFetchHook.fetchActionHelper.extractHandlers(param, 'endScope');
                PushHookAnkiClose(() => fn(value));
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                param: {
                    mountElementSelector: '.fetch-replacement-target',
                    fields: {
                        rangeHandle: {
                            type: 'text',
                            attrs: {
                                className: 'hidden',
                                value: 'closeDiag'
                            }
                        },
                    }
                }
            }
        },
        endScope: {
            fn: v => v,
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    rangeHandle: {
                        type: 'text',
                        attrs: {
                            className: 'hidden',
                            value: 'endScope'
                        }
                    },
                }
            }
        },
        AddTag: {
            fn(value, item, param) {
                const tags = superFetchHook.fetchActionHelper.replaceVars2Format(param.vars, item.tagName.replaceAll('，', ',').trim())
                superFetchHook.fetchActionHelper.tagForAnki(tags);
                return value
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    tagName: {
                        title: lang('ankiTag'),
                        type: 'text',
                        width: '13vw',
                    },
                }
            }
        }
    });

})();