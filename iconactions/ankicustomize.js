;(() => {
    const lang = superFetchHook.lang;

    superFetchHook.hookLang({
        openDiag: '打开anki制卡对话框',
        closeDiag: '关闭anki制卡',
        endScope: '结束作用域',
        makeAnkiCard: 'anki制卡',
        ankiTag: '标签名,多个用,隔开',
        AddTag: '打标签',
        customizeSearch: '添加搜索模式',
        'customizeSearch-desc': '将添加 deck field words queryExpress 4个变量，最后将queryExpress的值作为查询表达式',
        endCustomizeSearch: '结束添加搜索模式作用域',
        searchMode: '搜索模式标识',
        searchModeDesc: '该搜索模式的说明',
        addAnkiStyle: '添加anki制卡对话框样式',
        cssStyle: '样式内容',
        hookButton: '添加或者修改anki字段操作按钮',
        endHookButton: '结束添加或者修改anki字段操作按钮作用域',
        ankiField: 'anki字段名，不填表示所有字段',
        buttonHTML: '按钮的HTML,class注意必须包含且与前className表单值相同',
        hookRichText: '默认将按钮表示添加到纯文本字段，勾选表示添加到富文本字段',
        addFieldClickFn: '添加字段按钮左键单击事件',
        endFieldClickFn: '结束添加字段按钮左键单击事件作用域',
        addFieldContextMenuFn: '添加字段按钮右键点击事件',
        endFieldContextMenuFn: '结束字段添加按钮右键点击事件作用域',
        addSpellRichEditorButton: '添加富文本编辑器按钮',
        "addSpellRichEditorButton-desc": '需要创建一个按钮元素',
        buttonElementVarName: '创建的按钮元素变量名',
        endAddSpellRichEditorButton: '结束添加富文本编辑器按钮作用域',
        addQueryState: '添加富文本编辑器状态查询',
        endAddQueryStateScope: '结束富文本编辑器状态查询使用域',
        hookSave: 'anki保存卡片时勾子',
        endHookSaveScope: '结束anki保存卡时片勾子作用域',
        hookAnkiAfter: '默认在保存前执行，勾选后在保存后执行',
        afterShow: '展示结果时勾子',
        endAfterShowScope: '结束展示结果时勾子作用域',
    });
    superFetchHook.simpleValueHandlerHelper.addHandlers('makeAnkiCard', {
        openDiag: {
            fn(value, item, param) {
                const fn = superFetchHook.fetchActionHelper.extractHandlers(param, 'endScope', item.currentVarName, item.resetVars);
                PushHookAnkiDidRender(() => fn(value));
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    resetVars: {
                        type: 'checkbox',
                    },
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
                const fn = superFetchHook.fetchActionHelper.extractHandlers(param, 'endScope', item.currentVarName, item.resetVars);
                PushHookAnkiClose(() => fn(value));
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    resetVars: {
                        type: 'checkbox',
                    },
                    rangeHandle: {
                        type: 'text',
                        attrs: {
                            className: 'hidden',
                            value: 'closeDiag'
                        }
                    },
                }
            }
        },
        endScope: superFetchHook.simpleValueHandlerHelper.endScope('endScope'),
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
        },
        customizeSearch: {
            fn(value, item, param) {
                const fn = superFetchHook.fetchActionHelper.extractHandlers(param, ['customizeSearch', 'endCustomizeSearch'], item.currentVarName, item.resetVars);
                ankiHelper.ankiSearchHook[item.searchMode] = {
                    text: item.searchModeDesc,
                    async builder(deck, field, words) {
                        param.vars.deck = deck;
                        param.vars.field = field;
                        param.vars.words = words;
                        param.vars.queryExpress = words;
                        await fn(value);
                        return param.vars.queryExpress;
                    }
                }
                return value
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    searchMode: {
                        type: 'text',
                        width: '5vw',
                    },
                    searchModeDesc: {
                        type: 'text',
                        width: '5vw',
                    },
                    resetVars: {
                        type: 'checkbox',
                    },
                    rangeHandle: superFetchHook.simpleValueHandlerHelper.startScope('customizeSearch', '#8ca5ce')
                }
            }
        },
        endCustomizeSearch: superFetchHook.simpleValueHandlerHelper.endScope('endCustomizeSearch', '#8ca5ce'),
        addAnkiStyle: {
            fn(value, item, param) {
                PushHookAnkiStyle(superFetchHook.fetchActionHelper.replaceVars2Format(param.vars, item.cssStyle));
                return value
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    cssStyle: {
                        type: 'text',
                        width: '13vw',
                    },
                }
            }
        },
        hookButton: {
            async fn(value, item, param) {
                const fn = superFetchHook.fetchActionHelper.extractHandlers(param, ['hookButton', 'endHookButton'], item.currentVarName, item.resetVars);
                await fn(value);
                if (!item.className) {
                    return param.vars[item.currentVarName];
                }
                const click = param.vars.clickFn;
                delete param.vars.clickFn;
                const buildFn = async (eventName, call, fn, ev) => {
                    param.vars[`${eventName}Evt`] = ev;
                    param.vars[`${eventName}Fn`] = fn || (ev => ev);
                    param.vars.fieldEle = findParent(ev.target, '.form-item').querySelector('.field-value,.spell-content');
                    if (!item.hookRichText) {
                        param.vars.value = param.vars.fieldEle.value;
                    }
                    value = await call(value);
                };
                const clickFn = async (ev, fn) => {
                    await buildFn('click', click, fn, ev);
                };
                let contextMenuFn = null;
                if (param.vars?.contextMenuFn) {
                    const contextMenu = param.vars.contextMenuFn;
                    contextMenuFn = async (ev, fn) => {
                        ev.preventDefault();
                        await buildFn('contextMenu', contextMenu, fn, ev);
                    };
                    delete param.vars.contextMenuFn;
                }
                (item.hookRichText ? PushExpandAnkiRichButton : PushExpandAnkiInputButton)(item.className, item.button, clickFn, item.field, contextMenuFn)
                return param.vars[item.currentVarName];
                ;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    className: {
                        type: 'text',
                        width: '3.5vw',
                    },
                    field: {
                        title: lang('ankiField'),
                        type: 'text',
                        width: '3vw',
                    },
                    button: {
                        title: lang('buttonHTML'),
                        type: 'text',
                        width: '3vw',
                    },
                    hookRichText: {
                        type: 'checkbox'
                    },
                    resetVars: {
                        type: 'checkbox',
                    },
                    rangeHandle: superFetchHook.simpleValueHandlerHelper.startScope('hookButton', '#d9b187')
                }
            },

        },
        endHookButton: superFetchHook.simpleValueHandlerHelper.endScope('endHookButton', '#d9b187'),
        addFieldClickFn: {
            fn(value, item, param) {
                param.vars.clickFn = superFetchHook.fetchActionHelper.extractHandlers(param, ['addFieldClickFn', 'endFieldClickFn'], item.currentVarName, item.resetVars);
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    resetVars: {
                        type: 'checkbox',
                    },
                    rangeHandle: superFetchHook.simpleValueHandlerHelper.startScope('addFieldClickFn', '#e8aaff')
                }
            }
        },
        endFieldClickFn: superFetchHook.simpleValueHandlerHelper.endScope('endFieldClickFn', '#e8aaff'),
        addFieldContextMenuFn: {
            fn(value, item, param) {
                param.vars.contextMenuFn = superFetchHook.fetchActionHelper.extractHandlers(param, ['addFieldContextMenuFn', 'endFieldContextMenuFn'], item.currentVarName, item.resetVars);
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    resetVars: {
                        type: 'checkbox',
                    },
                    rangeHandle: superFetchHook.simpleValueHandlerHelper.startScope('addFieldContextMenuFn', '#6d6ae3')
                }
            }
        },
        endFieldContextMenuFn: superFetchHook.simpleValueHandlerHelper.endScope('endFieldContextMenuFn', '#6d6ae3'),
        addSpellRichEditorButton: {
            fn(value, item, param) {
                const fn = superFetchHook.fetchActionHelper.extractHandlers(param, ['addSpellRichEditorButton', 'endAddSpellRichEditorButton'], item.currentVarName, true);
                spellRichEditor.addButton(async field => {
                    const p = {...param, vars: {...param.vars}};
                    p.vars.field = field;
                    p.vars.elementVarName = item.elementVarName;
                    await fn(value, p);
                    const stateFn = p.vars[`${item.elementVarName}-stateFn`] ?? undefined;
                    stateFn && (spellRichEditor.addStateFn(field, stateFn), delete p.vars[`${item.elementVarName}-stateFn`]);
                    return p.vars[item.elementVarName];
                });
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    elementVarName: {
                        title: lang('buttonElementVarName'),
                        type: 'text',
                        width: '11vw',
                    },
                    rangeHandle: superFetchHook.simpleValueHandlerHelper.startScope('addSpellRichEditorButton', '#e89c4b')
                }
            }
        },
        endAddSpellRichEditorButton: superFetchHook.simpleValueHandlerHelper.endScope('endAddSpellRichEditorButton', '#e89c4b'),
        addQueryState: {
            fn(value, item, param) {
                param.vars[`${param.vars.elementVarName}-stateFn`] = superFetchHook.fetchActionHelper.extractHandlers(param, ['addQueryState', 'endAddQueryStateScope'], item.currentVarName, item.resetVars);
                return param.vars[item.currentVarName];
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    resetVars: {
                        type: 'checkbox',
                    },
                    rangeHandle: superFetchHook.simpleValueHandlerHelper.startScope('addQueryState', '#4b9ae8')
                }
            }
        },
        endAddQueryStateScope: superFetchHook.simpleValueHandlerHelper.endScope('endAddQueryStateScope', '#4b9ae8'),
        hookSave: {
            fn(value, item, param) {
                const fn = superFetchHook.fetchActionHelper.extractHandlers(param, ['hookSave', 'endHookSaveScope'], item.currentVarName,true);
                if (item.hookAfter) {
                    ankiHelper.PushAnkiAfterSaveHook(async (res, params) => {
                       await fn(value,undefined,vars=>{
                            vars.saveResult = res;
                            vars.param = params;
                        })
                    });
                } else {
                    ankiHelper.PushAnkiBeforeSaveHook(async (isUpdate, note) => {
                        await fn(value,undefined,vars=>{
                            vars.isUpdate = isUpdate;
                            vars.note = note;
                        })
                    });
                }
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    hookAfter: {
                        title: lang('hookAnkiAfter'),
                        type: 'checkbox',
                    },
                    rangeHandle: superFetchHook.simpleValueHandlerHelper.startScope('hookSave', '#5afc79')
                }
            },
        },
        endHookSaveScope: superFetchHook.simpleValueHandlerHelper.endScope('endHookSaveScope', '#5afc79'),
        afterShow: {
            fn(value, item, param) {
                const fn = superFetchHook.fetchActionHelper.extractHandlers(param, ['afterShow', 'endAfterShowScope'], item.currentVarName, true);
                ankiHelper.PushShowFn(card => {
                    fn(value, undefined, vars => vars.note = card);
                });
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    rangeHandle: superFetchHook.simpleValueHandlerHelper.startScope('afterShow', '#c7d33d')
                }
            },
        },
        endAfterShowScope: superFetchHook.simpleValueHandlerHelper.endScope('endAfterShowScope', '#c7d33d'),

    }, {scope: {fetch: '*'},});

    PushHookAnkiClose(() => Object.keys(spellRichEditor.stateFns).forEach(k => delete spellRichEditor.stateFns[k]));
})();