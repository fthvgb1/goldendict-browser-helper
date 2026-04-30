;(() => {

    const rightTrim = superFetchHook.allowFn.rightTrim;
    const {
        htmlType, operations, formProcessor,
        templateHelper, mapTitle,
        log, getVarVal, anchorFn, handleOp, eventHook: eventFn,
    } = superFetchHook;

    superFetchHook.hookLang({
        'simpleValueHandlers': '简单函数集合',
        codeRelate: '编码相关函数',
        encodeURI: '进行url转义',
        decodeURI: '解url转义',
        atob: 'base64解码',
        btoa: '进行base64编码',
        'NBSPtoSpace': '将特殊空格转成普通空格',
        'NBSPtoSpace-desc': '将特殊空格(char(160)NBSP)转成普通空格',
    });
    superFetchHook.eventHook.addTplFn = {
        ...superFetchHook.eventHook.addTplFn,
        replacement(data, ev) {
            data.from = ev.target.parentElement.dataset.from;
            return actions.handlers.replacement.getReplacementItem(data);
        },
        fetch(data) {
            data.from = 'fetch-fetch';
            return actions.handlers.fetch.getFetchItem(data);
        }
    };


    const scopeMap = {};

    const simpleValueHandlerHelper = {
        addHandlers(name, handlers, attr = {}) {
            const text = attr?.text ? attr.text : (mapTitle?.[name] ?? name);
            const title = attr?.title ? attr.title : (mapTitle?.[`${name}-desc`] ?? text);
            valueHandlers[name] = {
                ...attr,
                text: text,
                title: title,
                handlers: handlers,
                ...this.build(handlers),
            }
        },

        handleOptions(name, handler) {
            let text = mapTitle?.[name] ?? name, title = mapTitle?.[`${name}-desc`] ?? text;
            if (typeof handler === 'object') {
                text = handler.text ?? text;
                title = handler.title ?? title;
            }
            return [name, text, {title}]
        },

        getHandlerOptions(handlers) {
            return iterateObjByKey(handlers, (name, handler) => this.handleOptions(name, handler))
        },

        renderHooker(html, vars, options) {
            const searchInput = html.querySelector('.fetch-replacement-target');
            const select = templateHelper.createElement('select', {
                innerHTML: buildOption(options, vars?.searchValue ?? '', 0, 1, 2),
                className: searchInput.className,
                name: searchInput.name,
            });
            select.dataset.fnSet = '';
            searchInput.replaceWith(select);
        },
        buildOptions(handlers) {
            return this.getHandlerOptions(handlers);
        },
        execute(item, value, handlers, param = {}) {
            const name = item.searchValue;
            const handler = handlers?.[name];
            if (!handler) {
                log(name, 'not exist');
                return;
            }
            const fn = typeof handler === 'function' ? handler : handler.fn;
            return fn(value, item, param);
        },
        build(handlers) {
            let optionsArr = [];
            const getOptions = () => {
                if (optionsArr.length > 0) {
                    return optionsArr;
                }
                return optionsArr = simpleValueHandlerHelper.buildOptions(handlers);
            }

            let showHook = false, extraInput = '';
            iterateObjByKey(handlers, (k, handler) => {
                (handler?.show || handler?.showInput) && (showHook = true);
                handler?.extraShowInput && (extraInput += ',' + handler.extraShowInput);
            }, false);
            return {
                renderHook(html, vars) {
                    const act = html.querySelector('select.handleType').value;
                    simpleValueHandlerHelper.renderHooker(html, vars, scopeMap?.[act]?.[vars.from] ?? getOptions());
                    if (showHook) {
                        const select = html.querySelector('.fetch-replacement-target');
                        let handle = select.value;
                        handlers?.[handle]?.show?.(html, vars);
                        const selector = 'input[name=replaceValue],input[name=pattern]' + extraInput;
                        let inputs = html.querySelectorAll(selector);
                        const forEach = inputs.forEach;
                        handlers?.[handle]?.showInput && forEach
                            .bind(inputs)(el => handlers[handle].showInput.includes(el.name) && el.classList.add('show'));

                        select.addEventListener('change', ev => {
                            inputs = ev.target.parentElement.querySelectorAll(selector);
                            handle = select.value;
                            forEach.bind(inputs)(el => handlers[handle]?.showInput?.includes?.(el.name) ?
                                el.classList.add('show') : el.classList.remove('show'));
                            handlers?.[handle]?.show?.(ev.target.parentElement, vars);
                        });
                    }
                },
                handle(item, value, param = {}) {
                    return simpleValueHandlerHelper.execute(item, value, handlers, param);
                }
            }
        }
    };


    const valueHandlers = {
        replacement: {
            text: mapTitle['replacement'],
            title: mapTitle['replacement'],
            handle(item, value, eleParam) {
                return actionHelper.replaceString(item, value, eleParam?.vars)
            }
        },

        'remove element': {
            text: mapTitle['remove element'],
            title: mapTitle['remove element'],
            handle(item, value) {
                const el = templateHelper.createElement('div', value);
                el.querySelectorAll(item.searchValue).forEach(el => el.remove());
                return el.innerHTML;
            },
            scope: 'fetch',
        },

        parseTemplate: {
            text: mapTitle['parseTemplate'],
            title: mapTitle['parseTemplate'],
            handle(item, value, eleParam) {
                item.templateVar = actionHelper.replaceVars2Format(eleParam.vars, item.templateVar, true);
                item.replaceValue = actionHelper.replaceVars2Format(eleParam.vars, item.replaceValue, true);
                if (!item.templateVar || !item.replaceValue) {
                    return value;
                }
                return actionHelper.replaceString(item, item.templateVar, eleParam.vars);
            },
            scope: 'fetch',
        },
        simpleValueHandlers: {
            text: mapTitle['simpleValueHandlers'],
            title: mapTitle['simpleValueHandlers'],
            handle: (item, value, param) => {
                return simpleValueHandlerHelper.execute(item, value, valueHandlers.simpleValueHandlers.handlers, param);
            },
            options: {},
            getOptions(handlers, from) {
                if (this.options?.[from]?.length > 0) {
                    return this.options[from];
                }
                return this.options[from] = simpleValueHandlerHelper.buildOptions(handlers, from);
            },
            renderHook(html, vars) {
                simpleValueHandlerHelper.renderHooker(html, vars, this.getOptions(this.handlers, html.dataset.from))
            },
            handlers: {
                toUpperCase: str => str.toUpperCase(),
                toLowerCase: str => str.toLowerCase(),
                escapeHTML: htmlSpecial,
                unescapeHTML: decodeHtmlSpecial,
                NBSPtoSpace: {
                    text: mapTitle['NBSPtoSpace'],
                    title: mapTitle['NBSPtoSpace-desc'],
                    fn: s => s.replaceAll(' ', ' ')
                },
            },
        },
    };

    const actionHelper = {
        ...superFetchHook.fetchActionHelper,

        query(ele, selectorItem, last, keepItems = []) {
            const selector = selectorItem['fetch-selector'];
            if (selector === 'doc') {
                return last ? [[document]] : document;
            }
            const multiple = selectorItem['is_multiple'];
            const keep = selectorItem['keep-parent'];
            if (!(ele instanceof NodeList) && !Array.isArray(ele)) {
                const r = this.queryResults(ele, selector, multiple);
                if (r && last) {
                    return multiple ? [[...r, ...keepItems.map(this.flagParent)]] : [[r]];
                }
                return r;
            }
            const eles = [];
            if (!last) {
                ele.forEach(el => {
                    if (multiple) {
                        const ell = el.querySelectorAll(selector);
                        if (ell.length < 1) {
                            keep && keepItems.push(el);
                            return;
                        }
                        ell.forEach(ell => eles.push(ell));
                        return
                    }
                    const e = el.querySelector(selector);
                    if (!e) {
                        keep && keepItems.push(el);
                        return;
                    }
                    eles.push(el);
                });
                return eles;
            }

            ele.forEach(el => {
                const item = [];
                if (multiple) {
                    const ell = el.querySelectorAll(selector);
                    if (ell.length < 1) {
                        keep && keepItems.push(el);
                        return;
                    }
                    ell.forEach(e => item.push(e));
                    eles.push(item);
                    return
                }
                const e = el.querySelector(selector);
                !e && keep && keepItems.push(el);
                e && eles.push([e]);
            });
            return [...eles, ...keepItems.map(this.flagParent)];
        },
        queryResults(ele, selector, multiple) {
            if (multiple) {
                const r = ele.querySelectorAll(selector);
                return r.length < 1 ? null : r;
            }
            return ele.querySelector(selector);
        },

        flagParent(el) {
            el.eleType = 'parent';
            return [el];
        },

        fetchItem(ele, target, item, rules) {
            const cached = {};
            ele.forEach(
                ell => ell.splice(0, item['fetch-num'] < 1 ? ell.length : item['fetch-num'])
                    .forEach(el => {
                        if (!el) {
                            return;
                        }
                        const vars = this.getMultiVars(el, rules, item, cached);
                        const format = item['fetch-format'] ? item['fetch-format'] : iterateObjByKey(vars, k => k.endsWith('-ele') ? false : `{${k}}`).join('');
                        const value = this.replaceVars2Format(vars, format);
                        this.setValue(target, value, item);
                    }));
        },

        getMultiVars(el, rules, fetchConf, cached, vars = {}) {
            rules.forEach(item => this.getVars(el, item, fetchConf, el, vars, cached));
            return vars
        },

        findELeBySelector(t, sel, el, multiple = false) {
            if (!el) {
                return null;
            }
            if (t === 's') {
                return multiple ? el.querySelectorAll(sel) : el.querySelector(sel);
            }
            let ele = el;
            while (ele) {
                ele = anchorFn?.[t]?.(ele);
                if (ele && ele.matches(sel)) {
                    break
                }
            }
            return ele;
        },
        findEleByNum(t, num, el) {
            if (!el || num < 1) {
                return null;
            }
            let ele = el;
            do {
                if (!ele) {
                    break;
                }
                ele = anchorFn?.[t]?.(ele);
            } while (--num)
            return ele;
        },

        grammarCharacters: new Set(['s', 'ps', 'p', 'ns']),
        anchor2Ele(rule, ele, item, from) {
            const expression = rule['value-selector'];
            if (!expression) {
                return null
            }
            const multiple = rule['multiple_child'] ?? false;
            if (!expression.includes('@') && !expression.includes('%')) {
                const m = {child: ele, spell: from, doc: document};
                if (m?.[expression]) {
                    return m[expression];
                }
                return multiple ? ele.querySelectorAll(expression) : ele.querySelector(expression);
            }
            const expressions = expression.split('%');
            let i = 0;
            for (const exp of expressions) {
                i++;
                if (exp === 'parent') {
                    const parentSelector = item?.['selector-items']?.[item['selector-items'].length - 2]?.['fetch-selector'];
                    ele = ele?.eleType === 'parent' ? ele : this.findELeBySelector('p', parentSelector, ele);
                    continue;
                }
                if (exp === 'spell') {
                    ele = from
                    continue;
                }
                if (exp === 'doc') {
                    ele = document;
                    continue;
                }
                if (exp === 'child') {
                    if (ele?.eleType === 'parent') {
                        return null
                    }
                    continue;
                }
                const arr = exp.split('@').map(v => v.trim());
                if (arr.length < 1 || !this.grammarCharacters.has(arr[0])) {
                    continue
                }
                ele = isNaN(parseInt(arr[1])) ?
                    this.findELeBySelector(arr[0], arr.slice(1).join(''), ele, multiple && i === expressions.length)
                    : this.findEleByNum(arr[0], arr[1], ele);
                if (!ele) {
                    return null;
                }
            }
            return ele;
        },
        fetchReplaceVarsRex: /\{(.*?)}/g,
        reg: /\{.*}/,
        templateVarself: /\{\{(.*?)}}/g,
        tamperVar: /\{\$(.*?)}/g,
        replaceVars2Format(vars, str, empty = false) {
            if (!str) {
                return str;
            }
            return str.replace(this.tamperVar, (substring, name) => {
                const t = GM_getValue(name, '');
                return t ? t : substring
            }).replace(this.templateVarself, (substring, name) => {
                if (!vars?.[name]) {
                    return substring
                }
                return this.replaceVars2Format(vars, vars[name]);
            }).replace(this.fetchReplaceVarsRex, (substring, name) => {
                name = name.replace('@i@', vars['@i@']);
                if (name.endsWith('?')) {
                    name = rightTrim(name, '?');
                    if (name.includes('.')) {
                        return getVarVal(vars, name, '');
                    }
                    return vars?.[name] ?? '';
                }
                const d = empty ? '' : substring;
                if (name.includes('.')) {
                    return getVarVal(vars, name, d);
                }
                return vars?.[name] ?? d;
            });
        },

        handItems(items, value, param) {
            const first = items?.[0];
            if (param.rule.handleValue && (first.searchValue || actionHelper.accessEmpty.has(first.handleType))) {
                const name = param.rule['super-fetch-name'];
                for (const item of items) {
                    const rule = {...item};
                    value = param.vars[name] = valueHandlers[rule.handleType].handle(rule, value, param);
                    if (rule?.break) {
                        break;
                    }
                }
            }
            return value;
        },
        defaultReg: /\{(.*?)}/,
        getDefVars(defaultVal, vars) {
            if (!this.reg.test(defaultVal)) {
                return defaultVal;
            }
            if (!defaultVal.includes('|')) {
                return getVarVal(vars, superFetchHook.allowFn.trims(defaultVal, '{}'), defaultVal);
            }
            const name = this.defaultReg.exec(defaultVal)[1].split('|');
            for (const k of name) {
                if (vars.hasOwnProperty(k)) {
                    if (name.length > 1 && !vars[k]) {
                        continue;
                    }
                    return vars[k];
                }
            }
            return defaultVal;
        },
        getDefaultValue(rule, vars) {
            const format = rule['fetch-format'], name = rule['super-fetch-name'];
            let defaultVal = rule['default-value'];
            vars[name] = defaultVal;
            if (defaultVal) {
                vars[name] = defaultVal = this.getDefVars(defaultVal, vars);
            }
            if (format && vars[name]) {
                vars[name] = this.replaceVars2Format(vars, format);
            }
            return vars[name];
        },
        parseVar(vars, name, el, rule, ele, fetchConf, from, cached, globalVars = vars) {
            const children = {}, param = {
                rule, beforeQueryEle: ele, afterQueryEle: el,
                fetchParam: fetchConf, vars, from, globalVars
            }, type = rule['fetch-data-type'];
            vars[`${name}-ele`] = el;
            let value = '';
            if ('htmlElement' === type) {
                value = el;
            } else if (actionHelper.isTextNode(el)) {
                value = el.value;
            } else {
                value = 'text' === type ? el.innerText : el[type];
            }
            vars[name] = value;
            vars[name] = this.handItems(rule?.['replacement-items'], value, param);
            rule?.children?.forEach(item => children[item['super-fetch-name']] = this.getVars(el, item, fetchConf, from, vars, cached));
            if (vars[name] && rule?.['fetch-format']) {
                vars[name] = this.replaceVars2Format(vars, rule['fetch-format']);
            }
            return vars[name];
        },

        handleVars(rule, name, vars, param) {
            vars[name] = this.getDefVars(rule['default-value'], vars);
            vars[name] = this.handItems(rule['replacement-items'], vars[name], param);
            if (Array.isArray(vars[name]) && rule.multiple_child && rule?.children?.length > 0) {
                const set = new Set();
                vars[name] = vars[name].filterAndMapX(v => {
                    const val = {...vars};
                    rule.children.forEach(child => {
                        val[name] = v;
                        const p = {...param, vars: val};
                        const childName = child['super-fetch-name'];
                        val[childName] = this.handleVars(child, childName, val, p);
                    });

                    if (rule?.['fetch-format']) {
                        val[name] = this.replaceVars2Format(val, (rule['fetch-format']));
                    }
                    if (!rule['fetch-repeat']) {
                        return val[name];
                    }
                    if (set.has(val[name])) {
                        return false;
                    }
                    set.add(val[name]);
                    return val[name];
                });
                if (rule.concatenation) {
                    vars[name] = vars[name].join(rule.separator);
                }
            } else {
                rule?.children?.forEach(child => {
                    const childName = child['super-fetch-name'];
                    vars[childName] = this.handleVars(child, childName, vars, param);
                });

                if (rule['fetch-format']) {
                    vars[name] = this.replaceVars2Format(vars, rule['fetch-format']);
                }
            }

            return vars[name];
        },

        // fetch vars
        getVars(ele, rule, fetchConf, from, vars = {}, cached = {}, globalVars = vars) {
            const name = rule['super-fetch-name'], param = {
                rule, beforeQueryEle: ele,
                fetchParam: fetchConf, vars, from, globalVars
            };
            if (rule.cached && cached.hasOwnProperty(name)) {
                vars[name] = cached[name];
                return vars[name];
            }
            rule['value-selector'] = this.replaceVars2Format(vars, rule['value-selector']);
            if (!rule['value-selector']) {
                return vars[name] = this.handleVars(rule, name, vars, param);
            }
            const el = this.anchor2Ele(rule, ele, fetchConf, from);
            if (!el || el?.length < 1) {
                vars[name] = this.getDefaultValue(rule, vars);
                log("query rule's value-selector fail", ele, rule['value-selector'], rule);
            } else if (el instanceof NodeList && el.length > 0) {
                const s = new Set();
                vars[name] = [...el].filterAndMapX((ell, i) => {
                    const v = {...vars};
                    v['@i@'] = i;
                    const r = this.parseVar(v, name, ell, rule, ele, fetchConf, from, cached, vars);
                    if (!rule?.['fetch-repeat']) {
                        return r;
                    }
                    if (s.has(r)) {
                        return false;
                    }
                    s.add(r);
                    return r;
                });
                if (rule['concatenation']) {
                    vars[name] = vars[name].join(rule.separator)
                }
            } else {
                this.parseVar(vars, name, el, rule, ele, fetchConf, from, cached);
            }
            if (rule.cached) {
                cached[name] = vars[name];
            }
            return vars[name];
        },

        setValue(target, value, item) {
            actionHelper.isTextNode(target) ? this.setInputOrTextarea(target, value, item) : this.setEle(target, value, item);
        },

        log: console.log,

        handleResult(value, diff, setValue, item) {
            const t = item['fetch-data-handle'];
            if (t === 'none') {
                return;
            }
            if (t === 'log') {
                this.log(value);
                return;
            }
            if (t === 'cover') {
                setValue(value);
                return
            }
            if (item['fetch-repeat'] && diff()) {
                return;
            }
            setValue(value);
        },

        setEle(target, value, item) {
            this.handleResult(value, () => {
                const el = templateHelper.createElement('div', value);
                return target.innerHTML.includes(el.innerHTML)
            }, v => target.insertAdjacentHTML('beforeend', v), item)
        },

        setInputOrTextarea(input, value, item) {
            this.handleResult(value, () => input.value.includes(value), v => input.value += v, item);
        },


        replaceString(item, str, vars = {}) {
            item.replaceValue = this.replaceVars2Format(vars, item.replaceValue);
            if (!item?.pattern) {
                item.searchValue = this.replaceVars2Format(vars, item.searchValue);
                return str.replaceAll(item.searchValue, item.replaceValue);
            }
            const pattern = item.pattern === 'none' ? '' : item.pattern;
            return str.replace(new RegExp(item.searchValue, pattern), item.replaceValue);
        },

        textNode: new Set(['INPUT', 'TEXTAREA']),
        valueNode: new Set(['INPUT', 'TEXTAREA', 'SELECT']),
        accessEmpty: new Set([]),
    };


    const actions = {

        handlers: {
            fetch: {
                action(param, from, target) {
                    if (param['selector-items'].length < 1 || param?.['super-fetch-items']?.length < 1) {
                        log('not have valid fetch rule!', param)
                        return;
                    }
                    const rule = actionHelper.parseFetchRule(param?.['super-fetch-items']);
                    if (!rule) {
                        log('not have valid fetch rule!')
                        return;
                    }
                    const selectorItems = [...param['selector-items']];
                    let ele = from, keep = [], i = 0;
                    while (true) {
                        i++;
                        const selectorItem = selectorItems.splice(0, 1)?.[0];
                        if (!selectorItem?.['fetch-selector']) {
                            i === 1 && actionHelper.fetchItem([[from]], target, param, rule);
                            return;
                        }
                        const last = selectorItems.length < 1;
                        ele = actionHelper.query(ele, selectorItem, last, keep);
                        if (!ele) {
                            return;
                        }
                        if (last) {
                            break
                        }
                    }
                    actionHelper.fetchItem(ele, target, param, rule);
                },
                text: mapTitle['fetch'], // option innerText
                scope: 'all', // all html text;
                desc: mapTitle['fetch'], // option title
                getTemplate(data) {
                    data['selector-items'] = data?.['selector-items'] ? data['selector-items'] : [{}];
                    data['fetch-chain-html'] = data['selector-items']
                        .map(item => templateHelper.buildTemplateHTML('selector-chain', item));
                    this.getFetchItem(data);
                    return templateHelper.buildTemplateHTML('fetch', data);
                },
                // optional
                form(el, data) {
                    data['selector-items'] = [];
                    el.querySelectorAll('.selector-chain .selector-item').forEach(li => {
                        const item = formProcessor.getFormValue(li, {}, 'input');
                        data['selector-items'].push(item);
                    })
                    const items = el.querySelector('.super-fetch-items');
                    if (!items) {
                        return data;
                    }
                    data['super-fetch-items'] = [];
                    el.querySelectorAll('.super-fetch-item')?.forEach(item => {
                        const selector = ':where(input,select,textarea):not(.fetch-replacement-item :where(input,select,textarea))';
                        const dat = formProcessor.getFormValue(item, {}, selector);
                        actions.handlers.replacement.form(item, dat);
                        data['super-fetch-items'].push(dat);
                    });
                    return data;
                },
                // self helper
                getFetchItem(data) {
                    data['handleOp'] = handleOp;
                    return data['super-fetch-item-html'] = (data?.['super-fetch-items'] ?? [{}]).map(item => {
                            item.htmlType = htmlType;
                            item.operations = operations;
                            item.from = 'fetch-' + (item.operation ?? 'fetch');
                            item['replacement-item-html'] = actions.handlers.replacement.getReplacementItem(item);
                            return templateHelper.buildTemplateHTML('fetch-item', item);
                        }
                    );
                }
            },
            tag: {
                action(param, from) {
                    if (!from instanceof Element) {
                        return
                    }
                    if (from.querySelectorAll(param['tag-selector']).length > 0) {
                        const tags = $('#anki-tags');
                        const hadSelected = tags.val();
                        if (hadSelected.indexOf(param['fetch-tag']) < 0) {
                            hadSelected.push(param['fetch-tag']);
                            addNewTags(tags, hadSelected);
                            tags.val(hadSelected).trigger('change');
                        }
                    }
                },
                text: mapTitle['tag'],
                desc: mapTitle['tag-desc'],
                scope: 'html',
                getTemplate: (data) => {
                    return templateHelper.buildTemplateHTML('tag', data);
                }
            },
            handleElement: {
                action(param, from, target) {
                    const fetchItems = [], handleItems = [], vars = {};
                    param['super-fetch-items'].forEach(item => item?.operation === 'handle' ? handleItems.push(item) : fetchItems.push(item));
                    const rule = actionHelper.parseFetchRule(fetchItems);
                    if (rule) {
                        actionHelper.getMultiVars(from, rule, param, vars, vars);
                    }
                    handleItems.forEach(item => {
                        const attr = item['fetch-data-type'] === 'text' ? 'innerText' : item['fetch-data-type'],
                            name = item['super-fetch-name'];
                        const selector = item['value-selector'];
                        if ('spell' === selector) {
                            item['replacement-items'].forEach(item => this.handlerHelper(item, target, attr, vars));
                            if (item?.['fetch-format']) {
                                target[attr] = actionHelper.replaceVars2Format(vars, item['fetch-format']);
                                name && (vars[name] = target[attr]);
                            }
                            return
                        }

                        target.querySelectorAll(item['value-selector']).forEach((ele, i) => {
                            vars['@i@'] = i;
                            item['replacement-items'].forEach(item => this.handlerHelper(item, ele, attr, vars));
                            if (!item?.['fetch-format']) {
                                return
                            }
                            ele[attr] = actionHelper.replaceVars2Format(vars, item['fetch-format']);
                            name && (vars[name] = ele[attr]);
                        });

                    });
                },
                handlerHelper(item, ele, attr, vars) {
                    if (item.searchValue || actionHelper.accessEmpty.has(item.handleType)) {
                        if (this.handlers?.[item.handleType]) {
                            this.handlers?.[item.handleType](item, ele);
                            return
                        }
                        ele[attr] = valueHandlers[item.handleType].handle(item, ele[attr], vars);
                    }
                },
                scope: 'html',
                text: mapTitle['handleElement'],
                desc: mapTitle['handleElement-desc'],
                form: (el, data) => actions.handlers.fetch.form(el, data),
                getTemplate: (data) => {
                    actions.handlers.fetch.getFetchItem(data);
                    return templateHelper.buildTemplateHTML('handleElement', data);
                },
                handlers: {
                    'remove element': (item, target) => {
                        target.querySelectorAll(item.searchValue).forEach(el => el.remove());
                    }
                }
            },
            replacement: {
                action(param, target) {
                    param['replacement-items'].forEach(item => {
                        const t = item.handleType;
                        target.value = valueHandlers[t].handle(item, target.value, {});
                    });
                },
                text: mapTitle['replacement'],
                desc: mapTitle['replacement'],
                scope: 'text',
                getTemplate(data) {
                    data.from = 'replacement';
                    this.getReplacementItem(data);
                    return templateHelper.buildTemplateHTML('replacement', data);
                },
                form(el, data) {
                    if (el.querySelector('.super-fetch-item')) {
                        return data;
                    }
                    const selector = 'input,textarea,select';
                    data['replacement-items'] = [];
                    el.querySelectorAll('.fetch-replacement-item').forEach(li => {
                            const datum = formProcessor.getFormValue(li, {}, selector);
                            valueHandlers?.[datum.handleType]?.form?.(li, datum);
                            data['replacement-items'].push(datum);
                        }
                    );
                    return data;
                },
                opType: {},
                getHandlers(from) {
                    if (this.opType?.[from]?.length > 0) {
                        return this.opType[from];
                    }
                    const [name, handle] = from.split('-');
                    return this.opType[from] = iterateObjByKey(valueHandlers, (k, handler) => {
                        if (handler.scope) {
                            if ('string' === typeof handler.scope && name !== handler.scope) {
                                return false
                            }
                            if ('object' === typeof handler.scope) {
                                if (!handler.scope?.[name]) {
                                    return false;
                                }
                                if (!handler.scope[name]?.[handle]) {
                                    return false
                                }
                            }
                            if (handler?.handlers && handler.scope[name]?.[handle]) { // second menu
                                const key = [k, from].join('.');
                                if ('*' === handler.scope[name][handle]) {
                                    setMapVal(key, simpleValueHandlerHelper.getHandlerOptions(handler.handlers), scopeMap);
                                } else {
                                    const ops = handler.scope[name][handle].split(',').map(kk => {
                                        return simpleValueHandlerHelper.handleOptions(kk, handler.handlers[kk])
                                    });
                                    setMapVal(key, ops, scopeMap);
                                }
                            }
                        }


                        return [k, handler.text, {title: handler.title}];
                    });
                },
                getReplacementItem(data = {}) {
                    data['replacement-items'] = data?.['replacement-items'] ? data['replacement-items'] : [{}];
                    return data['replacement-item-html'] = data['replacement-items'].map(item => {
                        item.opType = actions.handlers.replacement.getHandlers(data.from);
                        item.from = data.from;
                        return templateHelper.buildTemplateHTML('replacement-item', item)
                    });
                },
            }
        },
    };

    let setting;

    function vw(percent) {
        const w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        return (percent * w) / 100;
    }

    const evtFn = {
        ...eventFn,

        autoAddWidth() {
            const old = this.maxDeep;
            const items = [...setting.querySelectorAll('.fetch-item:not(.fetch-hidden):has(option[value=fetch]:checked)')]
                .map(el => [el, formProcessor.convertFetchParam(el)]);
            items.forEach(item => {
                const el = item[0];
                const rules = actionHelper.parseFetchRule(item[1]['super-fetch-items'].filter(v => v?.operation !== 'handle'));
                rules?.forEach(rule => this.calculateWidth(el, rule, 0));
            });
            if (this.maxDeep > old) {
                const offset = vw(evtFn.offsetWidth * this.maxDeep);
                document.querySelectorAll(this.changedEleSelector).forEach(el => {
                    let w = parseFloat(getComputedStyle(el).width.replace('px', ''));
                    w += offset;
                    el.style.width = `${w}px`;
                    el.style.maxWidth = '100%';
                });
            }
        },
        foldHidden(items, name, hidden) {
            const children = items.querySelectorAll(`.super-fetch-item:has(.parent-super-name[value="${name}"])`);
            children.forEach(el => {
                    hidden === '➕' ? el.classList.remove('fetch-hidden') : el.classList.add('fetch-hidden');
                    const pname = el.querySelector(`.super-fetch-name`).value;
                    el.children[0].innerText = '➖';
                    this.foldHidden(items, pname, hidden);
                }
            );
        },
        fold(evt) {
            const fold = evt.target.innerText;
            evt.target.innerText = fold === '➕' ? '➖' : '➕';
            const name = evt.target.parentElement.querySelector('.super-fetch-name').value;
            const items = findParent(evt.target, '.super-fetch-items');
            evtFn.foldHidden(items, name, fold);
            if (fold === '➕') {
                evt.target.parentElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        },
        maxDeep: 0,
        offsetWidth: 1,// vw
        inputValueSelectors: new Set(['super-fetch-name', 'parent-super-name']),
        autoAddWidths: ev => {
            if (!evtFn.inputValueSelectors.has(ev.target.className)) {
                return
            }
            evtFn.autoAddWidth();
        },
        calculateWidth(el, rule, deep) {
            if (deep > 0) {
                const ele = el.querySelector(`.super-fetch-item:has(input[value="${rule['super-fetch-name']}"])`);
                if (ele) {
                    ele.style.marginLeft = `${deep * evtFn.offsetWidth}vw`;
                }
            }
            const item = el.querySelector(`.super-fetch-item:has(.super-fetch-name[value='${rule["super-fetch-name"]}'])`);
            item.dataset.deep = deep;
            if (rule?.children?.length > 0) {
                item.dataset.fold = 'true';
                deep++;
                if (deep > this.maxDeep) {
                    this.maxDeep = deep;
                }
                const input = el.querySelector(`.super-fetch-name[value="${rule['super-fetch-name']}"]`);
                let color = input.dataset?.color;
                if (!color) {
                    color = `hsla(${Math.random() * 360}, 51%, 85%, 0.7)`;
                    input.dataset.color = color;
                    input.style.backgroundColor = color;
                }
                rule.children.forEach(child => {
                    const ele = el.querySelector(`.super-fetch-item:has(.super-fetch-name[value='${child["super-fetch-name"]}'])`);
                    if (ele) {
                        ele.dataset.color = color;
                        ele.style.backgroundColor = color;
                    }
                    this.calculateWidth(el, child, deep)
                })
            } else {
                delete item.dataset?.fold
            }
        },
    };

    PushExpandAnkiInputButton('fetch-fold', '', evtFn.fold);


    PushHookAnkiChange('.fetch-item-select', (ev, fn) => {
        fn?.(ev);
        evtFn.autoAddWidth();
    });

    PushHookAnkiChange('.handleType', ev => {
        const li = ev.target.parentElement;
        const from = li.dataset.from;
        const newLi = actions.handlers.replacement.getReplacementItem({from})[0];
        newLi.querySelector('.handleType').replaceWith(ev.target);
        li.replaceWith(newLi);
        const type = ev.target.value;
        const data = formProcessor.getFormValue(newLi, {}, 'input,select,textarea');
        data.from = from;
        valueHandlers?.[type]?.renderHook?.(newLi, data, ev);
    });

    const codeRelateHandlers = {
        encodeURI, decodeURI, decodeURIComponent, encodeURIComponent, atob, btoa,
    };
    valueHandlers['codeRelate'] = {
        text: mapTitle['codeRelate'],
        title: mapTitle['codeRelate'],
        handlers: codeRelateHandlers,
        ...simpleValueHandlerHelper.build(codeRelateHandlers)
    };

    PushHookAnkiChange('.operation', ev => {
        const el = findParent(ev.target, '.super-fetch-item').querySelector('.fetch-replacement-items');
        const data = actions.handlers.replacement.form(el, {});
        data.from = 'fetch-' + ev.target.value;
        const lis = actions.handlers.replacement.getReplacementItem(data);
        [...el.children].forEach((child, i) => child.replaceWith(lis[i]))
    });

    PushHookAnkiHtml(div => {
        setting = div.querySelector('.select-setting');
        setting.addEventListener('blur', ev => evtFn.autoAddWidths(ev), true);
    });

    PushHookAnkiClose(() => evtFn.maxDeep = 0);

    superFetchHook.simpleValueHandlerHelper = simpleValueHandlerHelper;
    superFetchHook.templateHelper.templateFnHook['replacement-item'] = (html, vars) => {
        valueHandlers?.[vars.handleType]?.renderHook?.(html, vars);
        return html;
    };

    const show = evtFn.showProcessor;
    evtFn.showProcessor = ev => {
        show(ev);
        if (!ev.target.checked) {
            return;
        }
        evtFn.autoAddWidth();
        const fns = [...setting.querySelectorAll('.fetch-replacement-items')].map(el => setEleDrag(el, 'li'));
        evtFn.dragEle['replaceItem'] = onOff => fns.forEach(fn => fn(onOff));
        evtFn.dragEle.replaceItem(true);
        evtFn.dragEle['fetch-item'] = setEleDrag(setting, '.fetch-item');
        evtFn.dragEle['fetch-item'](true);
        evtFn.dragEle['super-fetch-item'] = setEleDrag(setting, '.super-fetch-item');
        evtFn.dragEle['super-fetch-item'](true);
    };
    superFetchHook.valueHandlers = valueHandlers;
    superFetchHook.mergeMap(superFetchHook.fetchActionHelper, actionHelper);
    superFetchHook.mergeMap(superFetchHook.fetchActions, actions);
    superFetchHook.mergeMap(superFetchHook.eventHook, evtFn);
})();