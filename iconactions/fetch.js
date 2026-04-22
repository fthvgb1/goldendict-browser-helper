;(() => {

    const rightTrim = superFetchHook.allowFn.rightTrim;
    const {
        htmlType, opType, operations, formProcessor,
        buildChildrenHtmlFn: templateHelper, mapTitle,
        log, getVarVal, anchorFn, handleOp, eventHook: eventFn,
    } = superFetchHook;

    function findELeBySelector(t, sel, el, multiple = false) {
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
    }

    function findEleByNum(t, num, el) {
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
    }

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
                        const format = item['fetch-format'] ? item['fetch-format'] : Object.keys(vars).map(k => `{${k}}`).join('');
                        const value = this.replaceVars2Format(vars, format);
                        this.setValue(target, value, item);
                    }));
        },

        getMultiVars(el, rules, fetchConf, cached, vars = {}) {
            rules.forEach(item => this.getVars(el, item, fetchConf, el, vars, cached));
            return vars
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
                    ele = ele?.eleType === 'parent' ? ele : findELeBySelector('p', parentSelector, ele);
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
                    findELeBySelector(arr[0], arr.slice(1).join(''), ele, multiple && i === expressions.length)
                    : findEleByNum(arr[0], arr[1], ele);
                if (!ele) {
                    return null;
                }
            }
            return ele;
        },
        fetchReplaceVarsRex: /\{(.*?)}/g,
        templateVarself: /\{\{(.*?)}}/g,
        tamperVar: /\{\$(.*?)}/g,
        replaceVars2Format(vars, str) {
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
                if (name.includes('.')) {
                    return getVarVal(vars, name, substring);
                }
                return vars?.[name] ?? substring;
            });
        },

        handItems(items, varEle, param, clone = false) {
            items.forEach(rule => {
                const r = this.replace({...rule}, varEle, clone, param);
                param.vars[param.rule['super-fetch-name']] = varEle.innerHTML;
                if (!r) {
                    return
                }
                varEle = r;
            });
            return varEle.innerHTML;
        },
        extractValue(varEle, item, param = {}) {
            const type = item['fetch-data-type'], name = param.rule['super-fetch-name'];
            let returnFn, value;
            if (!this.isTextNode(varEle)) {
                param.vars[name] = value = type === 'text' ? varEle.innerHTML : varEle[type];
                returnFn = () => {
                    const t = type === 'text' ? 'innerText' : type;
                    return varEle?.[t] ?? '';
                }
            } else {
                param.vars[name] = value = varEle.value;
                returnFn = () => value;
            }

            const first = item['replacement-items']?.[0];
            if (first && (first.searchValue || this.accessEmpty.has(first.replace_target_type))) {
                if (this.valueNode.has(varEle.nodeName)) {
                    varEle = templateHelper.createElement('div', {innerHTML: varEle.value});
                } else {
                    varEle = varEle.cloneNode(true);
                    let textNode = this.getDestEle(param.fetchParam);
                    textNode = textNode ? this.isTextNode(textNode) : false;
                    if (type === 'text' && !textNode) {
                        varEle.innerHTML = varEle.innerText;
                        returnFn = () => varEle.innerHTML;
                    }
                }
                varEle.innerHTML = value = this.handItems(item['replacement-items'], varEle, param, true);
            }
            return returnFn();
        },
        defaultReg: /\{(.*?)}/,
        getDefVars(defaultVal, vars) {
            if (this.fetchReplaceVarsRex.test(defaultVal)) {
                if (defaultVal.includes('|')) {
                    const name = this.defaultReg.exec(defaultVal)[1].split('|');
                    for (const k of name) {
                        if (vars.hasOwnProperty(k)) {
                            if (name.length > 1 && !vars[k]) {
                                continue;
                            }
                            defaultVal = vars[k];
                            break
                        }
                    }
                } else {
                    defaultVal = this.replaceVars2Format(vars, defaultVal)
                }
            }
            return defaultVal;
        },
        getDefaultValue(rule, vars, param) {
            const format = rule['fetch-format'], selector = rule['value-selector'], name = rule['super-fetch-name'];
            let defaultVal = rule['default-value'];
            vars[name] = defaultVal;
            if (format && !selector && !defaultVal) {
                return vars[name] = this.replaceVars2Format(vars, format);
            }
            if (defaultVal) {
                vars[name] = defaultVal = this.getDefVars(defaultVal, vars);
            }
            if (selector) {
                if (format) {
                    vars[name] = defaultVal = this.replaceVars2Format(vars, format);
                }
                return vars[name];
            }

            if (defaultVal) {
                let d = templateHelper.createElement('div', {innerHTML: defaultVal});
                vars[name] = this.handItems(rule['replacement-items'], d, param, true);
            }
            if (format) {
                vars[name] = this.replaceVars2Format(vars, format);
            }
            return vars[name];
        },
        parseVar(vars, name, el, rule, ele, fetchConf, from, cached) {
            const children = {}, param = {
                rule, beforeQueryEle: ele, afterQueryEle: el,
                fetchParam: fetchConf, vars, from
            };
            if (rule['fetch-data-type'] !== 'htmlElement') {
                vars[name] = this.extractValue(el, rule, param);
                rule?.children?.forEach(item => children[item['super-fetch-name']] = this.getVars(el, item, fetchConf, from, vars, cached));
                if (vars[name] && rule?.['fetch-format']) {
                    vars[name] = this.replaceVars2Format(vars, rule['fetch-format']);
                }
                return vars[name];
            } else {
                vars[name] = el;
            }
            rule?.children?.forEach(item => children[item['super-fetch-name']] = this.getVars(el, item, fetchConf, from, vars, cached));
            if (rule?.['fetch-format']) {
                for (const key of Object.keys(children)) {
                    if (vars[key]) {
                        return vars[name] = this.replaceVars2Format(vars, rule['fetch-format']);
                    }
                }
                return '';
            }
            return vars[name] ? vars[name] : this.getDefaultValue(rule, vars, param);
        },
        // fetch vars
        getVars(ele, rule, fetchConf, from, vars = {}, cached = {}) {
            const name = rule['super-fetch-name'];
            if (rule.cached && cached.hasOwnProperty(name)) {
                vars[name] = cached[name];
                return vars[name];
            }
            rule['value-selector'] = this.replaceVars2Format(vars, rule['value-selector']);
            const el = this.anchor2Ele(rule, ele, fetchConf, from);
            if (!el || el?.length < 1) {
                vars[name] = this.getDefaultValue(rule, vars, {
                    rule, beforeQueryEle: ele, afterQueryEle: el,
                    fetchParam: fetchConf, vars, from
                });
                log("query rule's value-selector fail", ele, rule['value-selector'], rule);
            } else if (el instanceof NodeList && el.length > 0) {
                const s = new Set();
                vars[name] = [...el].filterAndMapX((ell, i) => {
                    const v = {...vars};
                    v['@i@'] = i;
                    const r = this.parseVar(v, name, ell, rule, ele, fetchConf, from, cached);
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
            this.isTextNode(target) ? this.setInputOrTextarea(target, value, item) : this.setEle(target, value, item);
        },

        setEle(target, value, item) {
            const t = item['fetch-data-handle'];
            if (t === 'none') {
                return;
            }
            if (t === 'cover') {
                target.innerHTML = value;
                return
            }
            if (item['fetch-repeat']) {
                const el = document.createElement('div');
                el.innerHTML = value;
                if (target.innerHTML.includes(el.innerHTML)) {
                    return;
                }
            }
            target.insertAdjacentHTML('beforeend', value);
        },

        setInputOrTextarea(input, value, item) {
            const t = item['fetch-data-handle'];
            if (t === 'none') {
                return;
            }
            if (t === 'cover') {
                input.value = value;
                return
            }
            if (item['fetch-repeat'] && input.value.includes(value)) {
                return;
            }
            input.value += value;
        },


        replaceString(item, target, assign, vars = {}) {
            if (!item['replace_regex_pattern']) {
                item.searchValue = this.replaceVars2Format(vars, item.searchValue);
                assign(target.replaceAll(item.searchValue, item.replaceValue));
                return;
            }
            //log(`'${target}'`,`'${target.replace(new RegExp(item['searchValue'],  item['replace_regex_pattern']), item['replaceValue'])}'`);
            assign(target.replace(new RegExp(item['searchValue'],
                    item['replace_regex_pattern'] === 'none' ? '' : item['replace_regex_pattern']),
                item['replaceValue']));
        },

        textNode: new Set(['INPUT', 'TEXTAREA']),
        valueNode: new Set(['INPUT', 'TEXTAREA', 'SELECT']),
        accessEmpty: new Set(['toUpperCase', 'toLowerCase', 'escapeHTML', 'unescapeHTML']),
        replaceFn: {
            'toUpperCase': (item, target) => actionHelper.convertCase(target, 'toUpperCase'),
            'toLowerCase': (item, target) => actionHelper.convertCase(target, 'toLowerCase'),
            parseTemplate(item, target, clone = false, eleParam = {}) {
                item.replaceValue = actionHelper.replaceVars2Format(eleParam.vars, item.replaceValue);
                if (!item?.templateVar || !item.replaceValue) {
                    return
                }
                item.templateVar = actionHelper.replaceVars2Format(eleParam.vars, item.templateVar);
                actionHelper.replaceString(item, item.templateVar,
                    actionHelper.isTextNode(target) ? r => target.value = r : r => target.innerHTML = r, eleParam.vars
                );
            },
        },

        generalElementHandleFn: {
            escapeHTML(item, target) {
                target.innerHTML = htmlSpecial(target.innerHTML);
            },
            unescapeHTML(item, target) {
                target.innerHTML = decodeHtmlSpecial(target.innerHTML);
            }
        },
        inputHandleFn: {
            escapeHTML(item, target) {
                target.value = htmlSpecial(target.value);
            },
            unescapeHTML(item, target) {
                target.value = decodeHtmlSpecial(target.value);
            }
        },

        convertCase(target, op) {
            if (this.isTextNode(target)) {
                target.value = target.value[op]()
                return
            }
            target.innerText = target.innerText[op]();
        },
        replace(item, target, clone = false, eleParam = {}) {
            if (!item['searchValue'] && !this.accessEmpty.has(item['replace_target_type'])) {
                return
            }
            if (this.replaceFn?.[item['replace_target_type']]) {
                this.replaceFn[item['replace_target_type']](item, target, clone, eleParam);
                return
            }
            return this.generallyReplace(item, target, clone, eleParam);
        },

        generallyReplace(item, target, clone = false, eleParam = {}) {
            if (item['replace_target_type'] === 'remove element') {
                target.querySelectorAll(item.searchValue).forEach(el => el.remove());
                return;
            }
            item.replaceValue = this.replaceVars2Format(eleParam.vars, item.replaceValue);
            if (this.isTextNode(target) && item['replace_target_type'] === 'text') {
                this.replaceString(item, target.value, val => target.value = val, eleParam.vars);
                return;
            }
            if (item.replace_target_type === 'text') {
                this.replaceString(item, target.innerText, v => target.innerText = v, eleParam.vars);
                return;
            }
            if (this.isTextNode(target) && this.inputHandleFn?.[item['replace_target_type']]) {
                return this.inputHandleFn[item['replace_target_type']](item, target, clone, eleParam);
            }
            if (this.generalElementHandleFn?.[item['replace_target_type']]) {
                return this.generalElementHandleFn[item['replace_target_type']](item, target, clone, eleParam);
            }

            if (clone && item['replace_target_type'] === 'outerHTML') {
                const el = templateHelper.createElement('div');
                el.insertAdjacentElement('beforeend', target);
                this.replaceString(item, el.innerHTML, v => {
                    el.innerHTML = v;
                }, eleParam.vars);
                return el.children[0];
            }
            this.replaceString(item, target[item['replace_target_type']], v => target[item['replace_target_type']] = v, eleParam.vars);
        },
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
                    el.querySelectorAll('.selector-chain .selector-item').forEach(li => {
                        const item = formProcessor.getFormValue(li, {}, 'input');
                        data?.['selector-items'] ? data['selector-items'].push(item) : data['selector-items'] = [item];
                    })
                    const items = el.querySelector('.super-fetch-items');
                    if (!items) {
                        return data;
                    }
                    el.querySelectorAll('.super-fetch-item')?.forEach(item => {
                        const dat = formProcessor.getFormValue(item, {}, 'input:not(.fetch-replacement-item input),select:not(.fetch-replacement-item select)');
                        actions.handlers.replacement.form(item, dat);
                        data?.['super-fetch-items'] ? data['super-fetch-items'].push(dat) : data['super-fetch-items'] = [dat];
                    });
                    return data;
                },
                // self helper
                getFetchItem(data) {
                    data['handleOp'] = handleOp;
                    return data['super-fetch-item-html'] = (data?.['super-fetch-items'] ?? [{}]).map(item =>
                        templateHelper.buildTemplateHTML('fetch-item', {
                            ...item, htmlType, opType, operations,
                            'replacement-item-html': eventFn.addTplFn.replacement(item),
                        })
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
                        target.querySelectorAll(item['value-selector']).forEach((ele, i) => {
                            vars['@i@'] = i;
                            actionHelper.handItems(item['replacement-items'], ele, {
                                vars, rule: param
                            });
                            if (!item?.['fetch-format']) {
                                return
                            }
                            item['fetch-data-type'] = item['fetch-data-type'] === 'text' ? 'innerText' : item['fetch-data-type'];
                            const name = item['super-fetch-name'], attr = item['fetch-data-type'];
                            vars[name] = ele[attr];
                            ele[attr] = actionHelper.replaceVars2Format(vars, item['fetch-format']);
                        });
                    });
                },
                scope: 'html',
                text: mapTitle['handleElement'],
                desc: mapTitle['handleElement-desc'],
                form: (el, data) => actions.handlers.fetch.form(el, data),
                getTemplate: (data) => {
                    actions.handlers.fetch.getFetchItem(data);
                    return templateHelper.buildTemplateHTML('handleElement', data);
                }
            },
            replacement: {
                action(param, target) {
                    param['replacement-items'].forEach(item => actionHelper.replace(item, target));
                },
                text: mapTitle['replacement'],
                desc: mapTitle['replacement'],
                scope: 'all',
                getTemplate(data) {
                    this.getReplacementItem(data);
                    return templateHelper.buildTemplateHTML('replacement', data);
                },
                form(el, data) {
                    if (el.querySelector('.super-fetch-item')) {
                        return data;
                    }
                    const selector = 'input,select';
                    el.querySelectorAll('.fetch-replacement-item')
                        .forEach(li => data?.['replacement-items'] ?
                            data['replacement-items'].push(formProcessor.getFormValue(li, {}, selector)) :
                            data['replacement-items'] = [formProcessor.getFormValue(li, {}, selector)]
                        );
                    return data;
                },
                getReplacementItem(data) {
                    data['replacement-items'] = data?.['replacement-items'] ? data['replacement-items'] : [{}];
                    data['replacement-item-html'] = data['replacement-items']
                        .map(item =>
                            templateHelper.buildTemplateHTML('replacement-item', {
                                ...item,
                                opType,
                            })
                        );
                    return data['replacement-item-html'];
                },
            }
        },
    };

    let setting;


    function vw(percent) {
        const w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        return (percent * w) / 100;
    }

    const evt = {
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
                const offset = vw(eventFn.offsetWidth * this.maxDeep);
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
            eventFn.foldHidden(items, name, fold);
            if (fold === '➕') {
                evt.target.parentElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        },
        maxDeep: 0,
        offsetWidth: 1,// vw
        inputValueSelectors: new Set(['super-fetch-name', 'parent-super-name']),
        autoAddWidths: evt => {
            if (!eventFn.inputValueSelectors.has(evt.target.className)) {
                return
            }
            eventFn.autoAddWidth();
        },
        calculateWidth(el, rule, deep) {
            if (deep > 0) {
                const ele = el.querySelector(`.super-fetch-item:has(input[value="${rule['super-fetch-name']}"])`);
                if (ele) {
                    ele.style.marginLeft = `${deep * eventFn.offsetWidth}vw`;
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

    PushExpandAnkiInputButton('fetch-fold', '', evt.fold)


    PushHookAnkiChange('.fetch-item-select', (ev, fn) => {
        fn?.(ev);
        evt.autoAddWidth();
    })

    PushHookAnkiHtml(div => {
        setting = div.querySelector('.select-setting');
        setting.addEventListener('blur', ev => eventFn.autoAddWidths(ev), true);
    });
    const show = evt.showProcessor;
    evt.showProcessor = ev => {
        show(ev);
        !ev.target.checked && evt.autoAddWidths(ev);
    };

    superFetchHook.mergeMap(superFetchHook.fetchActionHelper, actionHelper);
    superFetchHook.mergeMap(superFetchHook.fetchActions, actions);
    superFetchHook.mergeMap(superFetchHook.eventHook, evt);

})();