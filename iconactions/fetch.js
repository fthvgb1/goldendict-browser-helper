;(() => {

    const rightTrim = superFetchHook.allowFn.rightTrim;
    const {
        htmlType, formProcessor,
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
        replacement(data, ev, el) {
            if (el) {
                data = actions.replacement.getSingleItem(el);
                return actions.replacement.getReplacementItem({
                    'replacement-items': [data],
                    '$clone': true,
                    from: ev.target.parentElement.dataset.from
                })[0];
            }
            data.from = ev.target.parentElement.dataset.from;
            return actions.replacement.getReplacementItem(data);
        },
        fetch(data, ev, el) {
            if (el) {
                const item = actions.fetch.getSingleItem(el);
                data['super-fetch-items'] = [item];
                data['$clone'] = true;
                return actions.fetch.getFetchItem(data)[0];
            }
            data.from = 'fetch-fetch';
            return actions.fetch.getFetchItem(data);
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

        buildElement(field, value, vars, attr, pre) {
            const placeholder = attr?.title ?? superFetchHook.mapTitle[field] ?? field;
            const title = placeholder;
            attr.attrs = {
                placeholder, title, className: field + ' show', ...attr?.attrs,
            };
            let type = attr.type;
            if ('select' === attr.type) {
                value = attr.getOptions?.(value, vars) ?? '';
            } else {
                'textarea' !== attr.type && (type = 'input');
                attr.attrs.type = attr.type;
            }
            const ele = templateHelper.buildFormElement[type](field, value, attr.attrs);
            attr?.width && (ele.style.width = attr.width);
            'checkbox' === attr.type && (ele.checked = value);
            attr?.nodes && (iterateObjByKey(attr.nodes, (k, v) => ele.setAttribute(k, v), false));
            attr?.hook && (attr.hook(ele, value, vars, attr, pre));
            return ele;
        },

        buildFieldRender(param) {
            if (!param) {
                return null;
            }
            let fn = iterateObjByKey(param?.fields ?? {}, (field, attr) => {
                return (pre, html, vars) => {
                    const value = vars[field] ?? '';
                    const ele = superFetchHook.simpleValueHandlerHelper.buildElement(field, value, vars, attr, pre);
                    attr?.width && (ele.style.width = attr.width);
                    pre.nextElementSibling.matches('.replacement-add') ? pre.insertAdjacentElement('afterend', ele) : pre.nextElementSibling.replaceWith(ele);
                    attr?.pbgc && (pre.parentElement.dataset.color = attr.pbgc);
                    return attr?.afterInsertDoc?.(ele, value, vars, attr, pre) ?? ele;
                };
            });
            if (!fn || fn.length < 1) {
                fn = [pre => pre];
            }
            return (html, vars) => {
                const el = html.querySelector(param.mountElementSelector);
                const endEl = fn.reduce((pre, cur) => cur(pre, html, vars), el);
                while (true) {
                    const next = endEl.nextElementSibling;
                    if (!next || next.matches(param?.endEleSelector ?? '.replacement-add')) {
                        break
                    }
                    next.remove();
                }
            };
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

            let showHook, show = {};
            const fn = () => {
                iterateObjByKey(handlers, (k, handler) => {
                    (handler?.show || handler?.param) && (showHook = true);
                    handler?.param && (show[k] = simpleValueHandlerHelper.buildFieldRender(handler.param));
                }, false);

                showHook = Boolean(showHook);
            };
            return {
                /* seem not necessary
                form(el,vars){
                    handlers?.[vars?.searchValue]?.form?.(el,vars);
                },*/
                renderHook(html, vars) {
                    const act = html.querySelector('select.handleType').value;
                    simpleValueHandlerHelper.renderHooker(html, vars, scopeMap?.[act]?.[vars.from] ?? getOptions());
                    showHook === undefined && fn();
                    if (showHook) {
                        const select = html.querySelector('.fetch-replacement-target');
                        let handle = select.value;
                        show?.[handle]?.(html, vars);
                        handlers?.[handle]?.show?.(html, vars);
                        select.addEventListener('change', ev => {
                            handle = select.value;
                            handlers?.[handle]?.show?.(ev.target.parentElement, vars);
                            show?.[handle]?.(ev.target.parentElement, vars);
                        });
                    }
                },
                handle(item, value, param = {}) {
                    return simpleValueHandlerHelper.execute(item, value, handlers, param);
                }
            }
        },
        startScope(name, color = '#ebd0e7', attr = {}) {
            return {
                type: 'text',
                attrs: {
                    className: 'hidden',
                    value: name
                },
                pbgc: color,
                ...attr
            }
        },
        endScope(name, color = '#ebd0e7', attr = {}) {
            return {
                fn: v => v,
                param: {
                    mountElementSelector: '.fetch-replacement-target',
                    fields: {
                        rangeHandle: {
                            type: 'text',
                            attrs: {
                                className: 'hidden',
                                value: name
                            },
                            pbgc: color,
                        },
                    }
                },
                ...attr
            }
        }
    };


    superFetchHook.hookLang({
        'stringConjunction': '字符串拼接',
        'format': '可使用{变量}',
    });
    const valueHandlers = {
        replacement: {
            text: mapTitle['replacement'],
            title: mapTitle['replacement'],
            handle(item, value, eleParam) {
                if (!item.searchValue) {
                    return value;
                }
                return actionHelper.replaceString(item, value, eleParam?.vars)
            }
        },
        stringConjunction: {
            handle(item, value, param) {
                return actionHelper.replaceVars2Format(param.vars, item.format)
            },
            renderHook: simpleValueHandlerHelper.buildFieldRender({
                    mountElementSelector: '.handleType',
                    fields: {
                        format: {
                            type: 'text',
                            width: '17vw'
                        }
                    }
                }
            )
        },

        parseTemplate: {
            handle(item, value, eleParam) {
                item.templateVar = actionHelper.replaceVars2Format(eleParam.vars, item.templateVar, true);
                item.replaceValue = actionHelper.replaceVars2Format(eleParam.vars, item.replaceValue, true);
                if (!item.templateVar || !item.replaceValue) {
                    return value;
                }
                return actionHelper.replaceString(item, item.templateVar, eleParam.vars);
            },
            renderHook(li, vars) {
                li.querySelector('.handleType').insertAdjacentElement('afterend',
                    templateHelper.buildFormElement.input('templateVar', vars.templateVar ?? '', {
                        className: 'show templateVar'
                    })
                );
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

        getVar(v, param, getVar = false, defaultValue = undefined) {
            const scopes = {p: param.parentVars, g: param.globalVars};
            let [express, scope] = v.split('|');
            if (!actionHelper.reg.test(express)) {
                return getVar ? superFetchHook.getVarVal(scopes[scope] ?? param.vars, express) : express;
            }
            if (!scopes[scope]) {
                return superFetchHook.getVariable(param.vars, express, defaultValue);
            }
            express = this.replaceVars2Format(param.vars, express, true);
            if (!express) {
                return '';
            }
            const vars = scopes[scope] ?? param.vars;
            return superFetchHook.getVariable(vars, express, defaultValue);
        },
        getVarName(v, vars) {
            return v.split('.').map(vv => superFetchHook.getVariable(vars, vv, vv, true)).join('.');
        },

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

        global: {
            '$window': window,
            '$eval': new Proxy({}, {
                get(target, p) {
                    return eval(createScript(p));
                }
            })
        },

        async fetchItem(ele, target, item, rules, vars = {}) {
            const shareVar = Object.keys(vars).length > 0;
            for (const ell of ele ?? []) {
                const els = ell.splice(0, item['fetch-num'] < 1 ? ell.length : item['fetch-num']);
                for (const el of els ?? []) {
                    if (!el) {
                        continue;
                    }
                    const varss = await this.getMultiVars(el, rules, item, shareVar ? vars : {...this.global});
                    if (varss?.stopProcess) {
                        delete varss.stopProcess;
                        return;
                    }
                    const format = item['fetch-format'] ? item['fetch-format'] : iterateObjByKey(varss, k => (k.endsWith('-ele') || this.global[k]) ? false : `{${k}}`).join('');
                    const value = this.replaceVars2Format(varss, format);
                    this.setValue(target, value, item);
                }
            }
        },

        async getMultiVars(el, rules, fetchConf, vars = {}) {
            for (const item of rules) {
                const param = {
                    rule: item, beforeQueryEle: el,
                    fetchParam: fetchConf, vars, from: el, globalVars: vars, parentVars: vars
                }
                await this.getVars(el, item, param);
                if (param?.stopProcess) {
                    vars.stopProcess = true;
                    return vars;
                }
            }
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
        varRegX: /^\{.*}$/,
        fetchReplaceVarsRex: /\{(.*?)}/g,
        reg: /\{.*}/,
        templateVarself: /\{\{(.*?)}}/g,
        replaceVars2Format(vars, str, empty = false) {
            if (!str) {
                return str;
            }
            const fn = (v, name) => typeof v === 'string' ? v : name;
            return str.replace(this.templateVarself, (substring, name) => {
                if (!vars?.[name]) {
                    return substring
                }
                return this.replaceVars2Format(vars, vars[name]);
            }).replace(this.fetchReplaceVarsRex, (substring, name) => {
                if (name.endsWith('?')) {
                    name = rightTrim(name, '?');
                    if (name.includes('.')) {
                        return fn(getVarVal(vars, name, ''), name);
                    }
                    return fn(vars?.[name] ?? '', name);
                }
                const d = empty ? '' : substring;
                if (name.includes('.')) {
                    return fn(getVarVal(vars, name, d), name);
                }
                return fn(vars?.[name] ?? d, name);
            });
        },

        async handItems(items, value, param) {
            let names = param.rule['super-fetch-name'];
            let name = names;
            if (param.rule.handleValue) {
                param.handlers = [...items];
                param.fetchType = 'fetch';
                while (true) {
                    const item = param.handlers.shift();
                    if (!item) {
                        break
                    }
                    if ('function' === typeof item) {
                        value = await item(value, {}, param);
                        name && (param.vars[name] = value);
                        continue;
                    }
                    const handler = {currentVarName: name, ...item};
                    value = await valueHandlers[handler.handleType].handle(handler, value, param);
                    name = handler.currentVarName;
                    if (name) {
                        param.vars[name] = value;
                        if (!names) {
                            names = param.rule['super-fetch-name'] = name;
                        }
                    }
                    if (handler?.break || param?.break) {
                        break;
                    }
                }
            }
            return names ? param.vars[names] : param.vars[name];
        },
        defaultReg: /\{(.*?)}/,
        getDefVars(defaultVal, vars) {
            if (!this.reg.test(defaultVal)) {
                return defaultVal;
            }
            if (!defaultVal.includes('|')) {
                const express = superFetchHook.allowFn.trims(defaultVal, '{}');
                return getVarVal(vars, express, '');
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
            return '';
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
        async parseVar(vars, name, el, rule, param) {
            const children = {}, type = rule['fetch-data-type'];
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
            vars[name] = await this.handItems(rule?.['replacement-items'], value, param);
            if (param?.stopProcess) {
                return vars[name];
            }
            let symbolTable = vars;
            if (rule?.children?.length > 0) {
                symbolTable = rule.childUseIndependentSymbol ? {...vars} : vars;
                for (const item of rule?.children ?? []) {
                    const p = {...param, vars: symbolTable, parentVars: vars};
                    children[item['super-fetch-name']] = await this.getVars(el, item, p);
                    if (p?.stopProcess) {
                        return vars[name];
                    }
                }
            }
            if (vars[name] && rule?.['fetch-format']) {
                vars[name] = this.replaceVars2Format(symbolTable, rule['fetch-format']);
            }
            return vars[name];
        },

        async handleVars(rule, name, vars, param) {
            vars[name] = vars[name] ?? this.getDefVars(rule['default-value'], vars);
            vars[name] = await this.handItems(rule['replacement-items'], vars[name], param);
            if (param?.break) {
                delete param.break;
            }
            if (param?.stopProcess) {
                return vars[name];
            }
            if (rule.multiple_child && rule?.children?.length > 0) {
                if (vars[name] instanceof NodeList && vars[name].length > 0) {
                    await this.queryChildrenElements(vars[name], vars, name, param);
                    return vars[name];
                }
                const set = new Set(), arr = [];
                let iterator = vars[name], isObject = false;
                if (!vars[name]?.[Symbol.iterator]) {
                    isObject = true
                    iterator = Object.keys(vars[name]);
                }
                for (let v of iterator) {
                    const val = {...vars};
                    if (isObject) {
                        val[`${name}-$key`] = v;
                        v = vars[name][v];
                    }
                    let i = -1, breakIterator = false;
                    for (const child of rule.children) {
                        ++i;
                        val[`${name}-index`] = i;
                        val[name] = v;
                        const childName = child['super-fetch-name'];
                        const p = {
                            ...param, vars: val, rule: child, parentVars: vars,
                        };
                        val[childName] = await this.handleVars(child, childName, val, p);
                        if (p?.breakIterator) {
                            breakIterator = true;
                            break;
                        }
                        if (p?.breakChildrenHandle) {
                            break
                        }
                        if (p?.stopProcess) {
                            return vars[name];
                        }
                    }
                    if (breakIterator) {
                        break;
                    }
                    if (rule?.['fetch-format']) {
                        val[name] = this.replaceVars2Format(val, (rule['fetch-format']));
                    }
                    if (rule['fetch-repeat'] && set.has(val[name])) {
                        continue
                    }
                    set.add(val[name]);
                    arr.push(val[name]);
                }
                vars[name] = arr;
                if (rule.concatenation) {
                    vars[name] = vars[name].join(rule.separator);
                }
            } else {
                let symbolTable = vars;
                if (rule?.children?.length > 0) {
                    symbolTable = rule.childUseIndependentSymbol ? {...vars} : vars;
                    for (const child of rule.children) {
                        const childName = child['super-fetch-name'];
                        const p = {
                            ...param,
                            vars: symbolTable,
                            parentVars: vars,
                            rule: child
                        }
                        vars[childName] = await this.handleVars(child, childName, symbolTable, p);
                        if (p?.stopProcess) {
                            return vars[name];
                        }
                    }
                }
                /* if(param?.afterChildren?.length>0){
                     param.vars= symbolTable;
                     param.handlers = param.afterChildren;
                     vars[name] =await this.handItems(param.afterChildren, vars[name], param);
                     param.vars = vars;
                 }*/
                if (rule['fetch-format']) {
                    vars[name] = this.replaceVars2Format(symbolTable, rule['fetch-format']);
                }
            }

            return vars[name];
        },

        async queryChildrenElements(el, vars, name, param) {
            const s = new Set(), rule = param.rule;
            let i = -1;
            vars[name] = [];
            for (const ell of el) {
                ++i;
                const v = {...vars};
                v[`${name}-index`] = i;
                const r = await this.parseVar(v, name, ell, rule, {
                    ...param, vars: v, parentVars: vars
                });
                if (param?.stopProcess) {
                    return
                }
                if (rule?.['fetch-repeat'] && s.has(r)) {
                    continue;
                }
                s.add(r);
                vars[name].push(r);
            }
            if (rule['concatenation']) {
                vars[name] = vars[name].join(rule.separator)
            }
        },

        // fetch vars
        async getVars(ele, rule, param) {
            param.rule = rule;
            const name = rule['super-fetch-name'];
            const {vars, fetchParam: fetchConf, from, globalVars} = param;
            if (rule.cached && globalVars.hasOwnProperty(name)) {
                vars[name] = globalVars[name];
                return vars[name];
            }
            rule['value-selector'] = this.replaceVars2Format(vars, rule['value-selector']);
            if (!rule['value-selector']) {
                return vars[name] = await this.handleVars(rule, name, vars, param);
            }
            const el = this.anchor2Ele(rule, ele, fetchConf, from);
            if (!el || el?.length < 1) {
                vars[name] = this.getDefaultValue(rule, vars);
                log("query rule's value-selector fail", ele, rule['value-selector'], rule);
            } else if (el instanceof NodeList && el.length > 0) {
                await this.queryChildrenElements(el, vars, name, param)
            } else {
                const p = {...param, parentVars: vars};
                await this.parseVar(vars, name, el, rule, p);
                if (p?.stopProcess) {
                    param.stopProcess = true;
                }
            }
            if (rule.cached) {
                globalVars[name] = vars[name];
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
                setValue(value, t);
                return
            }
            if (item['fetch-repeat'] && diff()) {
                return;
            }
            setValue(value, t);
        },

        setEle(target, value, item) {
            this.handleResult(value, () => {
                const el = templateHelper.createElement('div', value);
                return target.innerHTML.includes(el.innerHTML)
            }, (v, t) => 'cover' === t ? target.innerHTML = v : target.insertAdjacentHTML('beforeend', v), item)
        },

        setInputOrTextarea(input, value, item) {
            this.handleResult(value, () => input.value.includes(value), (v, t) => 'cover' === t ? input.value = v : input.value += v, item);
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
        tagForAnki(tagNames) {
            const tags = $('#anki-tags');
            const hadSelected = tags.val(), newTags = [];
            tagNames.split(',').forEach(name => {
                !hadSelected.includes(name) && newTags.push(name);
            });
            if (newTags.length > 0) {
                hadSelected.push(...newTags);
                addNewTags(tags, hadSelected);
                tags.val(hadSelected).trigger('change');
            }
        },

        buildHandlers(handlers, param) {
            return async value => {
                const handlerss = param.handlers;
                param.handlers = handlers;
                value = await superFetchHook.fetchActionHelper.handItems(handlers, value, param);
                if (param?.break) {
                    param.handlers = [];
                    return value;
                }
                param.handlers = handlerss;
                return value;
            }
        },

        buildHandlersMap: {
            number: (param, option) => actionHelper.buildHandlers(param.handlers.splice(0, option), param),
            function: (param, option) => actionHelper.buildHandlers(option(param), param),
            string: (param, option) => {
                const i = param.handlers.findIndex(value => value?.rangeHandle === option);
                return actionHelper.buildHandlers(param.handlers.splice(0, i > -1 ? i : param.handlers.length), param);
            },
            array(param, option) {
                const [start, end] = option;
                const arr = [start], identifier = new Set(option);
                const h = [[]];
                while (true) {
                    const handler = param.handlers.shift();
                    if (!handler) {
                        break;
                    }
                    if (!identifier.has(handler?.rangeHandle)) {
                        h[h.length - 1].push(handler);
                        continue;
                    }
                    if (arr[arr.length - 1] === start && handler.rangeHandle === end) {
                        if (h.length < 2) {
                            break;
                        }
                        const handlers = h.pop();
                        arr.pop();
                        h[h.length - 1].push(superFetchHook.fetchActionHelper.buildHandlers(handlers, param))
                        if (arr.length < 1) {
                            break;
                        }
                        continue;
                    }
                    h.push([handler]);
                    arr.push(handler.rangeHandle);
                }
                return h;
            }
        },

        extractHandlers(param, option = 'endRangeHandle') {
            if (Array.isArray(option)) {
                const h = actionHelper.buildHandlersMap.array(param, option);
                if (h[0].length < 1) {
                    return v => v;
                }
                return actionHelper.buildHandlers(h[0], param);
            }
            return actionHelper.buildHandlersMap[typeof option]?.(param, option) ?? actionHelper.buildHandlers(param.handlers);
        }
    };


    const actions = {
        programmer: {},
        fetch: {
            async action(param, from, target, vars = {}) {
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
                    const selectorItem = selectorItems.shift();
                    if (!selectorItem?.['fetch-selector']) {
                        i === 1 && await actionHelper.fetchItem([[from]], target, param, rule, vars);
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
                await actionHelper.fetchItem(ele, target, param, rule, vars);
            },
            text: mapTitle['fetch'], // option innerText
            scope: 'all', // all html text;
            desc: mapTitle['fetch'], // option title
            singleRun: true, //can be added to contextmenu or automatic run
            getTemplate(data) {
                data['selector-items'] = data?.['selector-items'] ? data['selector-items'] : [{}];
                data['fetch-chain-html'] = data['selector-items']
                    .map(item => templateHelper.buildTemplateHTML('selector-chain', item));
                this.getFetchItem(data);
                return templateHelper.buildTemplateHTML('fetch', data);
            },
            // optional
            form(el, data = {}) {
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
                    data['super-fetch-items'].push(this.getSingleItem(item));
                });
                return data;
            },
            getSingleItem(el, data = {}, selector = ':where(input,select,textarea):not(.fetch-replacement-item :where(input,select,textarea))') {
                formProcessor.getFormValue(el, data, selector);
                actions.replacement.form(el, data);
                return data;
            },
            // self helper
            getFetchItem(data) {
                data['handleOp'] = handleOp;
                return data['super-fetch-item-html'] = (data?.['super-fetch-items'] ?? [{}]).map(item => {
                        item.htmlType = htmlType;
                        item.from = 'fetch-fetch';
                        item['$clone'] = data?.['$clone'] ?? false;
                        item['replacement-item-html'] = actions.replacement.getReplacementItem(item);
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
                    actionHelper.tagForAnki(param['fetch-tag']);
                }
            },
            text: mapTitle['tag'],
            desc: mapTitle['tag-desc'],
            scope: 'html',
            getTemplate: (data) => {
                return templateHelper.buildTemplateHTML('tag', data);
            }
        },
        replacement: {
            async action(param, target) {
                const p = {vars: {value: target.value}, rule: param, handles: [...param['replacement-items']]};
                while (true) {
                    const item = p.handles.shift();
                    if (!item) {
                        break;
                    }
                    p.vars.value = await valueHandlers[item.handleType].handle(item, p.vars.value, p);
                }
                target.value = p.vars.value;
            },
            text: mapTitle['replacement'],
            desc: mapTitle['replacement'],
            scope: 'text',
            getTemplate(data) {
                data.from = 'replacement';
                this.getReplacementItem(data);
                return templateHelper.buildTemplateHTML('replacement', data);
            },
            getSingleItem(li, data = {}) {
                formProcessor.getFormValue(li, data, 'input,textarea,select');
                valueHandlers?.[data.handleType]?.form?.(li, data);
                return data;
            },
            form(el, data = {}) {
                if (el.querySelector('.super-fetch-item')) {
                    return data;
                }
                data['replacement-items'] = [];
                el.querySelectorAll('.fetch-replacement-item').forEach(li => data['replacement-items']
                    .push(this.getSingleItem(li))
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
                            if ('fetch' === name && !handler.scope[name]?.[handle]) {
                                return false
                            }
                        }
                        const key = [k, from].join('.');
                        if ('fetch' === name) { // second menu
                            if (handler?.handlers && handler.scope[name]?.[handle]) {
                                if ('*' === handler.scope[name][handle]) {
                                    setMapVal(key, simpleValueHandlerHelper.getHandlerOptions(handler.handlers), scopeMap);
                                } else {
                                    const ops = handler.scope[name][handle].split(',').map(kk => {
                                        return simpleValueHandlerHelper.handleOptions(kk, handler.handlers[kk])
                                    });
                                    setMapVal(key, ops, scopeMap);
                                }
                            }
                        } else {
                            if ('*' === handler.scope[name]) {
                                setMapVal(key, simpleValueHandlerHelper.getHandlerOptions(handler.handlers), scopeMap);
                            } else {
                                const ops = handler.scope[name].split(',').map(kk => {
                                    return simpleValueHandlerHelper.handleOptions(kk, handler.handlers[kk])
                                });
                                setMapVal(key, ops, scopeMap);
                            }
                        }
                    }
                    const text = handler.text ?? mapTitle[k] ?? k;
                    const title = handler.title ?? mapTitle[`${k}-desc`] ?? text;
                    return [k, text, {title: title}];
                });
            },
            getReplacementItem(data = {}) {
                data['replacement-items'] = data?.['replacement-items'] ? data['replacement-items'] : [{}];
                return data['replacement-item-html'] = data['replacement-items'].map(item => {
                    item.opType = actions.replacement.getHandlers(data.from);
                    item.from = data.from;
                    item['$clone'] = data?.['$clone'] ?? false;
                    return templateHelper.buildTemplateHTML('replacement-item', item)
                });
            },
        }
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
                const rules = actionHelper.parseFetchRule(item[1]['super-fetch-items']);
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
        const newLi = actions.replacement.getReplacementItem({from})[0];
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


    PushHookAnkiHtml(div => {
        setting = div.querySelector('.select-setting');
        setting.addEventListener('blur', ev => evtFn.autoAddWidths(ev), true);
    });

    PushHookAnkiClose(() => evtFn.maxDeep = 0);

    superFetchHook.simpleValueHandlerHelper = simpleValueHandlerHelper;
    superFetchHook.templateHelper.templateFnHook['replacement-item'] = (html, vars) => {
        valueHandlers?.[vars.handleType]?.renderHook?.(html.children[0], vars);
        return html;
    };

    const show = evtFn.showProcessor;
    evtFn.showProcessor = ev => {
        show(ev);
        superFetchHook.openExtractionFns.forEach(fn => fn(ev.target.checked, setting));
        if (!ev.target.checked) {
            return;
        }
        iterateObjByKey(valueHandlers, (k, v) => {
            if (!v?.afterRender) {
                return
            }
            v?.afterRender?.forEach(v => v());
            v.afterRender = [];
        }, false);
        evtFn.autoAddWidth();
        setEleDrag(setting, '.fetch-item');
        setEleDrag(setting, '.fetch-replacement-item');
        setEleDrag(setting, '.super-fetch-item');
    };
    superFetchHook.valueHandlers = valueHandlers;
    superFetchHook.mergeMap(superFetchHook.fetchActionHelper, actionHelper);
    superFetchHook.mergeMap(superFetchHook.fetchActions, actions);
    superFetchHook.mergeMap(superFetchHook.eventHook, evtFn);
})();