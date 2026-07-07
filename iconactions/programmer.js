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
                        const name = [v['fetch-name'], item.codeBlockName].filter(v => v).join('.');
                        data.push({
                            id: name,
                            text: name,
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

})();