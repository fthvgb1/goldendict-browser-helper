;(() => {
    //console.log('hello programmer');

    superFetchHook.hookLang({
        codeBlockName: '代码块名， 当类型为函数时即为函数名',
        codeBlockType: '代码块类型',
        programmer: '简易编程',
        program: '程序',
        function: '函数',
        arg: '参数名,为空表示无需参数',
        returnVarName: '返回值变量名，为空则没有返回值',
        isAsync: '是否异步',
        functionName: '函数或方法名,从window对象中查找 window.object.method|window.function ，列表不存在可手动输入',
        callFunction: '执行函数',
        parameters: '参数, {var1},{var2}...',
        noReturn: '无需返回结果'
    });

    superFetchHook.templateHelper.templateFnHook['programmer-item'] = (html, vars) => {
        superFetchHook.fetchActions.programmer.codeBlockTypes[vars.codeBlockType]?.templateHook?.(html, vars);
    };

    PushHookAnkiChange('.codeBlockType', ev => {
        const el = findParent(ev.target, '.super-fetch-item');
        const codeBlockType = ev.target.value;
        superFetchHook.fetchActions.programmer.codeBlockTypes[codeBlockType]?.templateHook?.(el);
    });

    superFetchHook.fetchActions.programmer = {
        async action(param, vars = {}) {
            if (Object.keys(vars).length < 1) {
                vars = {...superFetchHook.fetchActionHelper.global};
            }
            for (const programmerItem of param.programmerItems) {
                await this.codeBlockTypes[programmerItem.codeBlockType].fn(programmerItem, vars, param);
                if (param.vars?.stopProcess) {
                    break;
                }
            }
        },
        singleRun: true,
        text: superFetchHook.lang('programmer'),
        getTemplate(data) {
            this.getItem(data);
            return superFetchHook.templateHelper.buildTemplateHTML('programmer', data);
        },
        form(el, data = {}) {
            const items = el.querySelector('.super-fetch-items');
            if (!items) {
                return data;
            }
            data.programmerItems = [];
            el.querySelectorAll('.super-fetch-item')?.forEach(el => {
                data.programmerItems.push(this.getSingleItem(el));
            });
            return data;
        },
        getSingleItem(el, item = {}) {
            superFetchHook.fetchActions.fetch.getSingleItem(el, item, ':where(input,select,textarea):not(:is(.fetch-replacement-item,.codeBockContainer) :where(input,select,textarea))');
            this.codeBlockTypes[item.codeBlockType]?.formHook?.(el, item);
            return item;
        },

        async callFunc(param, vars, globalVars = vars) {
            await superFetchHook.fetchActionHelper.handItems(param['replacement-items'],
                vars[param['super-fetch-name']] ?? null,
                {
                    vars,
                    rule: {
                        'super-fetch-name': param['super-fetch-name'],
                        handleValue: true,
                    },
                    fetchParam: param, globalVars: globalVars, parentVars: vars
                });
        },

        codeBlockTypes: {
            program: {
                async fn(param, vars) {
                    await superFetchHook.fetchActions.programmer.callFunc(param, vars);
                },
                templateHook(html) {
                    const div = html.querySelector('.codeBockContainer');
                    [...div.children].forEach(el => el.remove());
                }
            },
            function: {
                async fn(param, varss, config) {
                    const fn = async (...args) => {
                        const vars = {...varss};
                        param.arguments.forEach((name, i) => name && (vars[name] = args[i]));
                        await superFetchHook.fetchActions.programmer.callFunc(param, vars, varss);
                        if (param.returnVarName) {
                            const v = vars[param.returnVarName];
                            delete vars[param.returnVarName];
                            param.arguments.forEach(name => delete vars[name]);
                            return v;
                        }
                        param.arguments.forEach(name => delete vars[name]);
                    }
                    const name = [config['fetch-name'], param.codeBlockName].filter(v => v);
                    setMapVal(name.join('.'), fn, window);
                },
                templateHook(html, vars = {}) {
                    let div = html.querySelector('.codeBockContainer');
                    superFetchHook.templateHelper.buildTemplateHTML('functionArgs', vars, div);
                    const title = superFetchHook.lang('arg');
                    div = div.querySelector('.args');
                    !vars?.arguments && (vars.arguments = ['']);
                    vars.arguments.forEach(arg => {
                        div.insertAdjacentHTML('beforeend', `
                   <div>
                        <input type="text" class="arg" name="arg" placeholder="${title}" title="${title}" value="${htmlSpecial(arg)}">
                        <button data-op="add">+</button>
                        <button data-op="remove">-</button>
                    </div>
                    `)
                    });
                },
                formHook(el, data) {
                    data.arguments = [...el.querySelectorAll('.codeBockContainer [name=arg]')].map(i => i.value);
                    superFetchHook.formProcessor.getFormValue(el, data, 'input:not(.fetch-replacement-items input):not([name=arg])');
                }
            },
        },
        getItem(data) {
            const codeBlockTypes = iterateObjByKey(this.codeBlockTypes, k => [k, superFetchHook.lang(k)]);
            return data.programmerItems = (data?.programmerItems || [{}]).map(item => {
                    item.from = 'fetch-fetch';
                    item.codeBlockTypes = codeBlockTypes;
                    item['$clone'] = data?.['$clone'] ?? false;
                    if (!item?.['replacement-items'] || item['replacement-items'].length < 1) {
                        item['replacement-items'] = [{
                            handleType: 'valueRelation',
                            searchValue: 'setValue',
                            variableType: 'string',
                            leftValue: item?.['super-fetch-name'] ?? '',
                        }]
                    }
                    item['replacement-item-html'] = superFetchHook.fetchActions.replacement.getReplacementItem(item);
                    return superFetchHook.templateHelper.buildTemplateHTML('programmer-item', item);
                }
            );
        }
    };

    superFetchHook.eventHook.addTplFn.program = (data, ev, el) => {
        if (el) {
            data.programmerItems = [superFetchHook.fetchActions.programmer.getSingleItem(el, data)];
            data['$clone'] = true;
            return superFetchHook.fetchActions.programmer.getItem(data)[0]
        }
        return superFetchHook.fetchActions.programmer.getItem(data);
    };

    superFetchHook.valueHandlers.callFunction = {
        async handle(item, value, param) {
            let fn = superFetchHook.getVarVal(window, item.func);
            const args = item.parameters.split(',').map(v => superFetchHook.fetchActionHelper.getVar(v, param, false, v));
            if (fn) {
                return this.execute(fn, item, args, value);
            }
            await superFetchHook.executeActions(item.func.split('.')[0]);
            fn = superFetchHook.getVarVal(window, item.func);
            if (!fn) {
                console.log("can't find function", item.func)
                return value;
            }
            return this.execute(fn, item, args, value);
        },
        execute: async (fn, item, args, value) => {
            if (item.async) {
                fn(...args);
                return value
            }
            if (item.noReturn) {
                await fn(...args);
                return value;
            }
            return await fn(...args);
        },

        renderHook(li, vars, ev) {
            this.renderHookX(li, vars);
            const sel = li.querySelector('.func');
            const value = vars?.func ?? '';
            const fn = () => {
                const select2 = $(sel);
                let selected = false;
                const data = [];
                getAnkiFetchParams().forEach(v => {
                    if (v['operate-type'] !== 'programmer') {
                        return false
                    }
                    v.programmerItems.forEach(item => {
                        if (item.codeBlockType !== 'function') {
                            return
                        }
                        const param = '( ' + item.arguments.join(', ') + ' ) ' + item.returnVarName;
                        const name = [v['fetch-name'], item.codeBlockName].filter(v => v).join('.');
                        data.push({
                            id: name,
                            text: name + param,
                            selected: (value === name ? (selected = true, true) : false)
                        })
                    });
                });
                !selected && (data.unshift({id: value, text: value, selected: true}));
                data.unshift({id: '',});
                select2.select2({
                    placeholder: superFetchHook.lang('functionName'),
                    data: data,
                    allowClear: true,
                    tags: true,
                    width: '13vw',
                });
            }
            (ev || vars?.['$clone'] || window?._importItem) ? fn() : this.afterRender.push(fn);
        },
        afterRender: [],
        renderHookX: superFetchHook.simpleValueHandlerHelper.buildFieldRender({
            mountElementSelector: '.handleType',
            fields: {
                func: {
                    type: 'select',
                    attrs: {
                        className: 'hidden func'
                    },
                    getOptions(val) {
                        return buildOption([], val)
                    },
                },
                parameters: {
                    type: 'text',
                    width: '5vw'
                },
                async: {
                    type: 'checkbox'
                },
                noReturn: {
                    type: 'checkbox',
                    attr: {
                        className: 'noReturn'
                    }
                }
            }
        }),
    };
    const hiddenFn = ev => {
        const el = ev.target, name = 'addHidden';
        if (!el.classList.contains('field-name')) {
            return
        }
        const field = `${name}_${el.value}`;
        if (el.classList.contains(name)) {
            el.classList.remove(name);
            GM_deleteValue(field);
            return;
        }
        GM_setValue(field, true);
        el.classList.add(name);
    };
    PushHookAnkiHtml(html => {
        html.addEventListener('dblclick', hiddenFn);
        html.querySelectorAll('.field-name').forEach(input =>
            GM_getValue(`addHidden_${input.value}`) && input.classList.add('addHidden')
        );
        html.querySelector('.anki-search').addEventListener('mousedown', async ev => {
            if (ev.button !== 1 || ev.target.className !== 'anki-search') {
                return
            }
            ev.preventDefault();
            const field = findParent(ev.target, '.form-item').querySelector('.field-name').value;
            const express = await ankiHelper.getSearchType(ev, ankiHelper.getDefaultSearchType(field));
            navigator.clipboard.writeText(express).catch(e => console.log('copy', express, 'fail err:', e));
        })
    });

    superFetchHook.hookLang({
        iconAction: '添加划词点击图标操作',
        imgSrc: '图片地址，可为url,base64或变量',
        iconHandleDesc: '操作说明',
        addIcon: '添加划词点击图标',
        iconId: '图标id,用于标识图标和用于自定义添加事件时作为元素变量名',
        startAddIconHandle: '开始点击图标操作',
        endAddIconHandle: '结束点击图标操作',
        startCustomizationHandle: '自定义添加事件,图标元素变量为图标id',
        endAddCustomizationHandle: '结束自定义添加事件',
        endAddIcon: '结束添加划词点击图标操作',
        completeReplacement: '完全替换icon元素，需配合自定义添加事件使用,此时可以不用图片作为icon，即完全替换iconId变量为自定义元素，可用button等',
    });
    superFetchHook.simpleValueHandlerHelper.addHandlers('iconAction', {
        addIcon: {
            async fn(value, item, param) {
                const i = param.handlers.findIndex(v => v?.rangeHandle === 'endAddIcon') || param.handlers.length;
                const handlers = param.handlers.splice(i, param.handlers.length);
                let call, fn;
                const ii = param.handlers.findIndex(v => v?.rangeHandle === 'startAddIconHandle');
                if (ii > -1) {
                    param.handlers.splice(ii, 1);
                    fn = superFetchHook.fetchActionHelper.extractHandlers(param, ['startAddIconHandle', 'endAddIconHandle'], item.currentVarName);
                }
                const iii = param.handlers.findIndex(v => v?.rangeHandle === 'startCustomizationHandle');
                if (iii > -1) {
                    param.handlers.splice(iii, 1);
                    const customizeFn = superFetchHook.fetchActionHelper.extractHandlers(param, ['startCustomizationHandle', 'endAddCustomizationHandle'], item.currentVarName);
                    param.vars[item.iconId] = document.createElement('img');
                    await customizeFn(value);
                    call = () => param.vars[item.iconId];
                }
                await _addIconAction({
                    name: item.name,
                    id: item.iconId,
                    image: superFetchHook.fetchActionHelper.replaceVars2Format(param.vars, item.imgSrc),
                    trigger: fn ? async (text, hideIcon, event) => {
                        param.vars.text = text;
                        param.vars[item.iconId] = event.target;
                        param.vars.hideIcon = hideIcon;
                        value = await fn(value)
                    } : null,
                    call: call,
                }, item.replacement);
                param.handlers = handlers;
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    imgSrc: {
                        type: 'text',
                        width: '3vw',
                    },
                    name: {
                        title: superFetchHook.lang('iconHandleDesc'),
                        type: 'text',
                        width: '4.3vw',
                    },
                    iconId: {
                        type: 'text',
                        width: '3.4vw',
                    },
                    replacement: {
                        type: 'checkbox',
                        title: superFetchHook.lang('completeReplacement')
                    },
                    rangeHandle: superFetchHook.simpleValueHandlerHelper.startScope('addIcon', '#5a4027')
                }
            }
        },
        endAddIcon: superFetchHook.simpleValueHandlerHelper.endScope('endAddIcon', '#5a4027'),
        startAddIconHandle: superFetchHook.simpleValueHandlerHelper.endScope('startAddIconHandle', '#8ca5ce'),
        endAddIconHandle: superFetchHook.simpleValueHandlerHelper.endScope('endAddIconHandle', '#8ca5ce'),

        startCustomizationHandle: superFetchHook.simpleValueHandlerHelper.endScope('startCustomizationHandle', 'rgba(98,90,90,0.78)'),
        endAddCustomizationHandle: superFetchHook.simpleValueHandlerHelper.endScope('endAddCustomizationHandle', 'rgba(98,90,90,0.78)'),
    });

})();