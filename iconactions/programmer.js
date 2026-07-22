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
                    if (v['operate-type'] !== 'programmer' || !v?.programmerItems) {
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
                    dropdownAutoWidth: true
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
                    width: '4vw'
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
                const scopeFn = superFetchHook.fetchActionHelper.extractHandlers(param, 'endAddIcon', item.currentVarName);
                const data = {
                    name: item.name,
                    id: item.iconId,
                    image: superFetchHook.fetchActionHelper.replaceVars2Format(param.vars, item.imgSrc),
                }
                let v;
                if (param.vars.hasOwnProperty(data.id)) {
                    v = param.vars[data.id];
                }
                param.vars.iconParam = data;
                value = await scopeFn(value);
                let call, fn;
                if (param.vars?.clickFn) {
                    fn = param.vars.clickFn;
                    delete param.vars.clickFn;
                }
                if (param.vars?.callFn) {
                    call = param.vars.callFn;
                    delete param.vars.callFn;
                }
                (v !== undefined) && (param.vars[data.id] = v);
                delete param.vars.iconParam;
                await _addIconAction({
                    ...data,
                    trigger: fn ? async (text, hideIcon, event) => {
                        param.vars.text = text;
                        param.vars[item.iconId] = event.target;
                        param.vars.hideIcon = hideIcon;
                        param.vars.trContent = findParent(event.target, 'tr-icon').querySelector('tr-content');
                        param.vars.trDiv = param.vars.trContent.querySelector(':scope>div');
                        value = await fn(value)
                    } : null,
                    call: call,
                }, item.replacement);
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
                        width: '4.2vw',
                    },
                    iconId: {
                        type: 'text',
                        width: '3.3vw',
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
        startAddIconHandle: {
            fn(value, item, param) {
                param.vars.clickFn = superFetchHook.fetchActionHelper.extractHandlers(param, ['startAddIconHandle', 'endAddIconHandle'], item.currentVarName);
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    rangeHandle: superFetchHook.simpleValueHandlerHelper.startScope('startAddIconHandle', '#8ca5ce')
                }
            }
        },
        endAddIconHandle: superFetchHook.simpleValueHandlerHelper.endScope('endAddIconHandle', '#8ca5ce'),

        startCustomizationHandle: {
            async fn(value, item, param) {
                const customizeFn = superFetchHook.fetchActionHelper.extractHandlers(param, ['startCustomizationHandle', 'endAddCustomizationHandle'], item.currentVarName);
                item.iconId = param.vars.iconParam.id;
                param.vars[item.iconId] = document.createElement('img');
                value = await customizeFn(value);
                param.vars.callFn = () => param.vars[item.iconId];
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    rangeHandle: superFetchHook.simpleValueHandlerHelper.startScope('startCustomizationHandle', 'rgba(98,90,90,0.78)')
                }
            }
        },
        endAddCustomizationHandle: superFetchHook.simpleValueHandlerHelper.endScope('endAddCustomizationHandle', 'rgba(98,90,90,0.78)'),
    }, {scope: {fetch: '*'}});


    superFetchHook.hookLang({
        others: '其它杂项',
        tts: '文本转语音',
        voice: '声音',
        speed: '速度',
        selectVoice: '选择一个声音',
        ttsContent: '文本,可使用{变量}',
        lemmatizer: '查找单词的原型或词性',
        getLang: '获取文本所属语种',
        readTextFile: '读取一个文本文件',
        'readTextFile-desc': '需先让浏览器处于激活状态（随便点击下网页空白区域）',
        openAsBinary: '以进制方式打开',
        downAsFile: '下载变量的值为文件',
        filename: '文件名',
        mimeType: 'mimeType 默认为 text/plain'
    });
    superFetchHook.simpleValueHandlerHelper.addHandlers('others', {
        tts: {
            fn(value, item, param) {
                const text = superFetchHook.fetchActionHelper.replaceVars2Format(param.vars, item.content);
                if (!text) {
                    return value;
                }
                const voices = speechSynthesis.getVoices();
                const i = voices.findIndex(v => v.name === item.voice);
                const voice = voices[i];
                const utterance = new SpeechSynthesisUtterance();
                utterance.voice = voice;
                utterance.rate = item.speed;
                utterance.text = text;
                speechSynthesis.speak(utterance);
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    content: {
                        type: 'text',
                        width: '10vw',
                        title: superFetchHook.lang('ttsContent'),
                        attrs: {
                            className: 'content show needStretch'
                        }
                    },
                    speed: {
                        type: 'number',
                        width: '5vw',
                        hook(el, v) {
                            !v && (el.value = 1);
                            el.step = '0.01';
                            el.min = '0.01';
                            el.max = '5';
                        }
                    },
                    voice: {
                        type: 'select',
                        afterInsertDoc(el, value) {
                            const select2 = $(el);
                            const data = speechSynthesis.getVoices().map(v => (
                                {
                                    text: `${v.lang} ${v.name}${v.localService ? '--localService' : ''}`,
                                    id: v.name,
                                    selected: value === v.name
                                }
                            ));
                            data.unshift({id: '', text: '', selected: false});
                            select2.select2({
                                placeholder: superFetchHook.lang('selectVoice'),
                                data: data,
                                allowClear: true,
                                tags: true,
                                width: '26vw',
                                dropdownAutoWidth: true
                            });
                            return el.nextElementSibling
                        }
                    },
                }
            }
        },
        lemmatizer: {
            fn(value, item, param) {
                const text = superFetchHook.fetchActionHelper.replaceVars2Format(param.vars, item.text);
                const lang = lemmatizer.only_lemmas_withPos(text);
                const o = superFetchHook.valueHandlers.valueRelation.handlers.setValue.parseVal(item, param);
                o.set(lang);
                return param.vars[item.currentVarName];
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    leftValue: {
                        type: 'text',
                        width: '4vw',
                    },
                    text: {
                        title: superFetchHook.lang('ttsContent'),
                        type: 'text',
                        width: '6vw'
                    }
                }
            }
        },
        getLang: {
            fn(value, item, param) {
                const text = superFetchHook.fetchActionHelper.replaceVars2Format(param.vars, item.text);
                const lang = eld.detect(text).language;
                const o = superFetchHook.valueHandlers.valueRelation.handlers.setValue.parseVal(item, param);
                o.set(lang);
                return param.vars[item.currentVarName];
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    leftValue: {
                        type: 'text',
                        width: '4vw',
                    },
                    text: {
                        title: superFetchHook.lang('ttsContent'),
                        type: 'text',
                        width: '6vw'
                    }
                }
            }
        },
        readTextFile: {
            async fn(value, item, param) {
                const o = superFetchHook.valueHandlers.valueRelation.handlers.setValue.parseVal(item, param);
                const p = () => new Promise(resolve => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.onchange = async () => {
                        const file = input.files[0];
                        const content = item.openAsBinary ? await file.arrayBuffer() : await file.text();
                        resolve(content);
                        input.value = null;
                    };
                    input.dispatchEvent(new MouseEvent('click'));
                });
                const v = await p();
                o.set(v);
                return param.vars[item.currentVarName];
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    leftValue: {
                        type: 'text',
                        width: '6vw',
                    },
                    openAsBinary: {
                        type: 'checkbox'
                    }
                }
            }
        },
        downAsFile: {
            fn(value, item, param) {
                const v = superFetchHook.fetchActionHelper.getVar(item.leftValue, param, true);
                const type = superFetchHook.fetchActionHelper.replaceVars2Format(param.vars, item.mimeType, true);
                const blob = new Blob([v], {type: type || 'text/plain'});
                const a = document.createElement('a');
                const objectUrl = URL.createObjectURL(blob);
                a.href = objectUrl;
                a.download = superFetchHook.fetchActionHelper.replaceVars2Format(param.vars, item.filename);
                a.click();
                URL.revokeObjectURL(objectUrl);
                return value;
            },
            param: {
                mountElementSelector: '.fetch-replacement-target',
                fields: {
                    leftValue: {
                        title: superFetchHook.lang('varName'),
                        type: 'text',
                        width: '3vw',
                    },
                    mimeType: {
                        type: 'text',
                        width: '4vw',
                    },
                    filename: {
                        type: 'text',
                        width: '4vw',
                    },
                }
            }
        }
    }, {scope: 'fetch'});

})();