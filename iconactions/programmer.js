;(() => {
    //console.log('hello programmer');

    superFetchHook.hookLang({
        codeBlockName: '代码块名',
        codeBlockType: '代码块类型',
        programmer: '简易编程',
        program: '程序',
        function: '函数',
        arg: '参数名,为空表示无需参数',
        returnVarName: '返回值变量名，为空则没有返回值',
        isAsync: '是否异步',
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

        async callFunc(param, vars) {
            await superFetchHook.fetchActionHelper.handItems(param['replacement-items'],
                vars[param['super-fetch-name']] ?? null,
                {
                    vars,
                    rule: {
                        'super-fetch-name': param['super-fetch-name'],
                        handleValue: true,
                    },
                    fetchParam: param, globalVars: vars, parentVars: vars
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
                async fn(param, vars, config) {
                    if (!param.codeBlockName) {
                        console.log(superFetchHook.lang('codeBlockName'), 'is empty')
                        return;
                    }
                    let fn;
                    if (param.async) {
                        fn = async (...args) => {
                            param.arguments.forEach((name, i) => name && (vars[name] = args[i]));
                            await superFetchHook.fetchActions.programmer.callFunc(param, vars);
                            if (param.returnVarName) {
                                const v = vars[param.returnVarName];
                                delete vars[param.returnVarName];
                                param.arguments.forEach(name => delete vars[name]);
                                return v;
                            }
                            param.arguments.forEach(name => delete vars[name]);
                        }
                    } else {
                        fn = (...args) => {
                            param.arguments.forEach((name, i) => name && (vars[name] = args[i]));
                            superFetchHook.fetchActions.programmer.callFunc(param, vars);
                            if (param.returnVarName) {
                                const v = vars[param.returnVarName];
                                delete vars[param.returnVarName];
                                param.arguments.forEach(name => delete vars[name]);
                                return v;
                            }
                            param.arguments.forEach(name => delete vars[name]);
                        }
                    }


                    const name = [config['fetch-name'], param.codeBlockName];
                    setMapVal(name.join('.'), fn, window);
                },
                templateHook(html, vars = {}) {
                    let div = html.querySelector('.codeBockContainer');
                    superFetchHook.templateHelper.buildTemplateHTML('functionArgs', vars, div);
                    const title = superFetchHook.lang('arg');
                    div = div.querySelector('.args');
                    !vars?.arguments && (vars.arguments = []);
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
                    superFetchHook.formProcessor.getFormValue(el, data, 'input:not([name=arg])');
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
            data.programmerItems = [superFetchHook.fetchActions.fetch.getSingleItem(el, data)];
            data['$clone'] = true;
            return superFetchHook.fetchActions.programmer.getItem(data)[0]
        }
        return superFetchHook.fetchActions.programmer.getItem(data);
    }
})();