;(() => {
    console.log('hello programmer');

    superFetchHook.hookLang({
        codeBlockName: '代码块名',
        codeBlockType: '代码块类型',
        programmer: '简易编程',
        program: '程序',
        function: '函数',
    })

    superFetchHook.fetchActions.programmer = {
        async action(param, vars = {}) {
            if (Object.keys(vars).length < 1) {
                vars = {...superFetchHook.fetchActionHelper.global};
            }
            for (const programmerItem of param.programmerItems) {
                await this.codeBlockTypes[programmerItem.codeBlockType](programmerItem, vars);
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
            el.querySelectorAll('.super-fetch-item')?.forEach(item => {
                data.programmerItems.push(superFetchHook.fetchActions.fetch.getSingleItem(item));
            });
            return data;
        },
        codeBlockTypes: {
            async program(param, vars) {
                await superFetchHook.fetchActionHelper.handItems(param['replacement-items'], null, {
                    vars: vars,
                    'super-fetch-name': param['super-fetch-name'],
                    rule: {
                        'super-fetch-name': param['super-fetch-name'],
                        handleValue: true,
                    },
                    fetchParam: param, globalVars: {...vars}, parentVars: {...vars}
                })
            },
            function(param, vars) {
                if (!param.codeBlockName) {
                    console.log(superFetchHook.lang('codeBlockName'), 'is empty')
                    return
                }
                window[param.codeBlockName] = function (...args) {

                }
            },
        },
        getItem(data) {
            const codeBlockTypes = iterateObjByKey(this.codeBlockTypes, k => [k, superFetchHook.lang(k)]);
            return data.programmerItems = (data?.programmerItems || [{}]).map(item => {
                    item.from = 'fetch-fetch';
                    item.codeBlockTypes = codeBlockTypes;
                    item['$clone'] = data?.['$clone'] ?? false;
                    if (!item?.['super-fetch-name'] || !item?.['replacement-items']) {
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
})();