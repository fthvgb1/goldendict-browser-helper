;const {ankiFetchClickFn, ankiFetchData, getAnkiFetchParams, arrayDiff, superFetchHook, setEleDrag} = (() => {
    PushHookAnkiStyle(GM_getResourceText('extract-sentence'));

    PushHookAnkiDidRender(freshBtns);

    function changeAddDelBtn(ev, fn) {
        fn && fn(ev);
        freshBtns();
    }

    PushHookAnkiChange('#model', changeAddDelBtn);
    PushHookAnkiChange('.field-name', changeAddDelBtn);
    PushExpandAnkiInputButton('hammer', '', changeAddDelBtn);

    PushExpandAnkiInputButton('fetch-all', '', () => {
        document.querySelectorAll('.fetch-sentence-field').forEach(button => button.click());
    });
    PushExpandAnkiInputButton('fetch-delete', '', (e) => {
        findParent(e.target, '.fetch-item').remove();
    });

    PushExpandAnkiInputButton('sequentially-fetch', '', ev => GM_setValue('sequentially-fetch', ev.target.checked));
    PushExpandAnkiInputButton('fetch-add', '', (e) => {
        findParent(e.target, '.fetch-item').insertAdjacentElement('afterend', actionHelper.buildFetchItem({}));
    });
    PushExpandAnkiInputButton('fetch-export', '', () => eventFn.export());
    const importFn = ev => ev.target.parentElement.querySelector('.fetch-file').click();
    PushExpandAnkiInputButton('fetch-import', '', importFn, '', ev => {
        ev.preventDefault();
        ev.target.dataset['new'] = 'true';
        importFn(ev);
    });

    /**
     *
     * @param a arr
     * @param b arr
     * @param fn
     * @returns {*} a's item not in b
     */
    function diff(a, b, fn) {
        if (b.length <= 2 || (a.length <= b.length)) {
            return a.filter(aa => {
                let flag = false
                for (const bb of b) {
                    if (fn(aa, bb)) {
                        flag = true
                        break
                    }
                }
                return !flag;
            })
        }
        // maybe have some optimization
        const hadIndex = new Set();
        b.forEach(bb => {
            for (const i in a) {
                const aa = a[i];
                if (fn(aa, bb)) {
                    hadIndex.add(parseInt(i));
                    break
                }
            }
        });
        return a.filter((aa, i) => !hadIndex.has(i));
    }

    function objectsEqual(o1, o2) {
        return Object.keys(o1).length === Object.keys(o2).length
            && Object.keys(o1).every(p => o1[p] === o2[p])
    }

    const eventFn = {
        dragEle: {},
        export() {
            const data = JSON.stringify(getAnkiFetchParams('', false));
            const current = new Date();
            // wtf time format
            download(`fetch-rule.${current.getFullYear()}-${current.getMonth()}-${current.getDate()}.${current.getHours()}.${current.getMinutes()}.${current.getSeconds()}.json`, data);
        },
        showProcessor(ev) {
            const selector = '.fetch-import,.fetch-export';
            if (!ev.target.checked) {
                saveFetchItems();
                freshBtns();
                setting.children[0].classList.add('fetch-hidden');
                getFetchItemEles().map(e => e.remove());
                ev.target.parentElement.querySelectorAll(selector).forEach(btn => btn.classList.add('fetch-hidden'))
                return
            }
            let fetchItems = GM_getValue('fetch-items', [{}]);
            fetchItems.forEach(item => setting.appendChild(actionHelper.buildFetchItem(item)));
            if (GM_getValue('fetch-display-type', 1) === 2) {
                const arr = Object.groupBy(fetchItems, item => buttonField(item)) ?? [];
                const options = [];
                const nb = '&ensp;'.repeat(6);
                Object.keys(arr).forEach(k => {
                    options.push([k, k, {'data-names': arr[k].map(m => m['fetch-name']).join(',')}]);
                    arr[k].forEach(m => options.push([m['fetch-name'], nb + m['fetch-name']]));
                });
                setting.children[0].innerHTML = buildOption(options, options[1][0], 0, 1, 2);
                setting.children[0].classList.remove('fetch-hidden');
                setting.children.length > 2 && [...setting.children].slice(2).forEach(e => e.classList.add('fetch-hidden'));
            }
            const fns = [...setting.querySelectorAll('.fetch-replacement-items')].map(el => setEleDrag(el, 'li'));
            eventFn.dragEle['replaceItem'] = onOff => fns.forEach(fn => fn(onOff));
            eventFn.dragEle.replaceItem(true);
            eventFn.dragEle['fetch-item'] = setEleDrag(setting, '.fetch-item');
            eventFn.dragEle['fetch-item'](true);
            eventFn.dragEle['super-fetch-item'] = setEleDrag(setting, '.super-fetch-item');
            eventFn.dragEle['super-fetch-item'](true);
            ev.target.parentElement.querySelectorAll(selector).forEach(btn => btn.classList.remove('fetch-hidden'))
        },
        async importFn(ev) {
            const file = ev.target.files[0];
            const btn = ev.target.parentElement.querySelector('.fetch-import');
            const refresh = btn.dataset?.['new'];
            delete btn.dataset?.['new'];
            if (!file) {
                Swal.showValidationMessage(mapTitle['no file']);
                return
            }
            const items = await file.text().then(JSON.parse);
            if (!items || items.length < 1 || !items[0]?.['fetch-name']) {
                Swal.showValidationMessage(`can't parse rule file`);
                return
            }
            let newRule = [];
            if (refresh) {
                newRule = items;
                getFetchItemEles().forEach(el => el.remove());
            } else {
                const hadRule = getAnkiFetchParams('', false);
                newRule = diff(items, hadRule, (a, b) => JSON.stringify(a) === JSON.stringify(b));
            }

            if (newRule.length < 1) {
                Swal.showValidationMessage(mapTitle['redundantly import!']);
                return
            }
            const names = [];
            newRule.forEach(item => {
                const t = actionHelper.buildFetchItem(item);
                t.classList.add('fetch-item-specific');
                setting.appendChild(t);
                names.push([item['fetch-name'], item['fetch-name']]);
            });
            Swal.showValidationMessage(`已导入${newRule.length}条记录！`);
            if (GM_getValue('fetch-display-type', 1) === 2) {
                const options = buildOption(names, '', 0, 1);
                setting.children[0].insertAdjacentHTML('beforeend', options);
            }
        },
        add(ev) {
            const el = ev.target.dataset?.target ? findParent(ev.target, ev.target.dataset.target) : ev.target.parentElement;
            const em = el.cloneNode(true);
            em.querySelectorAll('input,select').forEach(ele => {
                const fn = {
                    INPUT(ele) {
                        ele.value = '';
                        if (ele.type === 'checkbox') {
                            ele.checked = false;
                        }
                    },
                    SELECT(ele) {
                        ele.value = ele.children[0].value
                    },
                    TEXTAREA(ele) {
                        ele.value = ''
                    }
                };
                fn?.[ele.nodeName] && fn[ele.nodeName](ele);
            });
            el.insertAdjacentElement('afterend', em);
        },
        copy(ev) {
            ev.preventDefault();
            const el = ev.target.dataset?.target ? findParent(ev.target, ev.target.dataset.target) : ev.target.parentElement;
            el.insertAdjacentElement('afterend', el.cloneNode(true));
        },
        remove(ev) {
            ev.target.dataset?.target ?
                findParent(ev.target, ev.target.dataset.target)?.remove()
                : ev.target.parentElement.remove();
        }
    };

    PushHookAnkiChange('.fetch-file', eventFn.importFn);
    PushExpandAnkiInputButton('fetch-copy', '', (e) => {
        const item = findParent(e.target, '.fetch-item');
        const copyItem = item.cloneNode(true);
        copyItem.querySelector('.fetch-active').checked = false;
        item.insertAdjacentElement('afterend', copyItem);
    });

    PushExpandAnkiInputButton('fetch-sentence-field', '', (ev) => {
        ankiFetchClickFn(ev.target);
    }, '', (ev) => {
        const button = ev.target;
        const targetField = button.parentElement.parentElement.querySelector('.sentence_field,.field-name').value.trim();
        const targetEle = button.parentElement.parentElement.querySelector('.spell-content,.field-value');
        const arr = getAnkiFetchParams(targetField, false);
        if (!arr || arr.length < 1) {
            return
        }
        ev.preventDefault();
        const sel = document.createElement('select');
        const map = {};
        const opts = arr.map(v => {
            map[v['fetch-name']] = v;
            return v['fetch-name'];
        });
        opts.unshift(['', '选择一个操作']);
        sel.innerHTML = buildOption(opts, '', 0, 1);
        const fn = (ev) => {
            if (sel.value) {
                ankiFetchData(map[sel.value], targetEle);
            }
            const evt = ev.type === 'click' ? 'change' : 'blur';
            sel.removeEventListener(evt, fn);
            sel.parentElement.replaceChild(button, sel)
        };
        sel.addEventListener('blur', fn);
        sel.addEventListener('change', fn);
        button.replaceWith(sel);
    });


    PushHookAnkiDidRender(() => setting.addEventListener('dblclick', settingItemSwitchDisplay));
    PushHookAnkiClose(() => setting.removeEventListener('dblclick', settingItemSwitchDisplay));

    function download(filename, text, type = "text/plain") {
        // Create an invisible A element
        const a = document.createElement("a");
        a.style.display = "none";
        document.body.appendChild(a);

        // Set the HREF to a Blob representation of the data to be downloaded
        a.href = window.URL.createObjectURL(
            new Blob([text], {type})
        );

        // Use download attribute to set set desired file name
        a.setAttribute("download", filename);

        // Trigger the download by simulating click
        a.click();

        // Cleanup
        window.URL.revokeObjectURL(a.href);
        document.body.removeChild(a);
    }

    function settingItemSwitchDisplay(ev) {
        if (!ev.target.classList.contains('fetch-item')) {
            return
        }
        const sel = setting.children[0];
        const items = [];
        const displayType = GM_getValue('fetch-display-type', 1);
        setting.querySelectorAll('.fetch-item').forEach(item => {
            items.push(item.querySelector('.fetch-name').value);
            if (displayType === 1 && item !== ev.target) {
                item.classList.add('fetch-hidden');
                return
            }
            item.classList.remove('fetch-hidden');
        });
        if (displayType === 2) {
            sel.classList.add('fetch-hidden');
            ev.target.scrollIntoView();
            ev.target.classList.add('fetch-item-specific');
            GM_setValue('fetch-display-type', 1);
            return;
        }
        const opts = items.map(name => [name, name])
        sel.innerHTML = buildOption(opts, ev.target.querySelector('.fetch-name').value, 0, 1)
        sel.classList.remove('fetch-hidden');
        GM_setValue('fetch-display-type', 2);
    }

    PushHookAnkiChange('.fetch-item-select', (ev) => {
        const fn = (name) => {
            const t = setting.querySelector(`.fetch-name[value='${name}']`);
            if (!t) {
                return
            }
            findParent(t, '.fetch-item').classList.remove('fetch-hidden');
        };
        const hidden = () => setting.querySelectorAll('.fetch-item:not(.fetch-hidden)').forEach(e => e.classList.add('fetch-hidden'));

        const el = ev.target.querySelector(`option[value='${ev.target.value === '*' ? '\\*' : ev.target.value}']`);
        if (el.dataset.hasOwnProperty('names')) {
            hidden()
            el.dataset.names.split(',').forEach(v => {
                fn(v);
            })
            return
        }
        hidden();
        fn(ev.target.value);
    });


    // show extract processor
    PushHookAnkiChange('#fetch.swal2-checkbox', eventFn.showProcessor);

    PushHookAnkiChange('.fetch-active', fetchActive);

    ['swal2-cancel swal2-styled',
        'swal2-confirm swal2-styled',
        'swal2-container swal2-center swal2-backdrop-hide'].forEach(className => {
        PushExpandAnkiInputButton(className, '', saveFetchItems);
    });


    function getFetchItemEles() {
        return [...setting.children].slice(1);
    }


    function buttonField(item) {
        return item?.['fetch-to-field'] ? item['fetch-to-field'] : item['fetch-field'];
    }

    function addBtn(input, items) {
        const title = items.filterAndMapX(item => item['fetch-active'] ? item['fetch-name'] : false).join(',');
        const btn = document.createElement('button');
        btn.classList.add('fetch-sentence-field');
        btn.title = title ? title + ' ' + mapTitle['right-operate'] : mapTitle['right-operate'];
        btn.innerHTML = '⚓';
        findParent(input, '.form-item')
            .querySelector('.field-operate')
            .insertAdjacentElement('beforeend', btn);
    }

    function freshBtns() {
        const items = getAnkiFetchParams() ?? [];
        if (items.length < 1) {
            return
        }
        const fetchMap = {};
        document.querySelectorAll('.fetch-sentence-field').forEach(el => el.remove());
        const generic = [];
        items.forEach(item => {
            if (item['fetch-field'] === '*') {
                generic.push(item);
                return
            }
            const field = buttonField(item);
            if (!fetchMap?.[field]) {
                fetchMap[field] = [];
            }
            fetchMap[field].push(item);
        });

        document.querySelectorAll('.field-name,.sentence_field').forEach(input => {
            const field = input.value;
            if (!fetchMap?.[field] && generic.length < 1) {
                return
            }
            if (!fetchMap?.[field]) {
                addBtn(input, generic);
                return;
            }
            addBtn(input, [...fetchMap[field], ...generic]);
        });
    }

    function fetchActive(ev) {
        freshBtns();
        saveFetchItems();
    }

    let setting;

    function saveFetchItems() {
        const data = getFetchItemEles().map(convertFetchParam);
        data.length > 0 && GM_setValue('fetch-items', data);
    }


    const formProcessor = {
        getFormValue(form, param = {}, selector = 'input:not([data-batch] input),select:not([data-batch] select),textarea:not([data-batch] textarea)') {
            [...form.querySelectorAll(selector)].forEach(el => {
                const k = el.name;
                let v = el.value;
                if (el.type === 'number' && !el.dataset?.float) {
                    v = parseInt(v);
                }
                if (el.type === 'checkbox') {
                    v = el.checked;
                }
                param[k] = v;
            });
            return param;
        },
        replacement(el, data) {
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
        superFetch(el, data) {
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
                formProcessor.replacement(item, dat);
                data?.['super-fetch-items'] ? data['super-fetch-items'].push(dat) : data['super-fetch-items'] = [dat];
            });
            return data;
        },
    };


    function convertFetchParam(item) {
        return Object.values(formProcessor).reduce((data, fn) => fn(item, data), {});
    }


    function setTags(from, param) {
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
    }

    const anchorFn = {
        p: el => el.parentElement,
        ns: el => el.nextElementSibling,
        ps: el => el.previousElementSibling,
    };

    function findELeBySelector(t, sel, el) {
        if (!el) {
            return null;
        }
        if (t === 's') {
            return el.querySelector(sel);
        }
        let ele = el;
        while (ele) {
            ele = anchorFn?.[t] ? anchorFn[t](ele) : null;
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
            ele = anchorFn?.[t] ? anchorFn[t](ele) : null;
        } while (--num)
        return ele;
    }

    const log = GM_getValue('dev', window?.['dev']) ? console.log.bind(window.console) : () => {
    };

    const actionHelper = {

        query(ele, selectorItem, last, keepItems = []) {
            const selector = selectorItem['fetch-selector'];
            const multiple = selectorItem['is_multiple'];
            const keep = selectorItem['keep-parent'];
            if (ele instanceof NodeList || Array.isArray(ele)) {
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
            }
            const r = this.queryResults(ele, selector, multiple);
            if (r && last) {
                return multiple ? [[...r, ...keepItems.map(this.flagParent)]] : [[r]];
            }
            return r;
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
            ele.forEach(
                ell => ell.splice(0, item['fetch-num'] < 1 ? ell.length : item['fetch-num'])
                    .forEach(el => {
                        if (!el) {
                            return;
                        }
                        const vars = this.getMultiVars(el, rules, item);
                        const format = item['fetch-format'] ? item['fetch-format'] : Object.keys(vars).map(k => `{${k}}`).join('');
                        const value = this.replaceVars2Format(vars, format);
                        this.setValue(target, value, item);
                    }));
        },

        getMultiVars(el, rules, fetchConf, vars = {}) {
            rules.forEach(item => this.getVars(el, item, fetchConf, vars));
            return vars
        },

        grammarCharacters: new Set(['s', 'ps', 'p', 'ns']),
        anchor2Ele(rule, ele, item) {
            const expression = rule['value-selector'];
            if (!expression.includes('@')) {
                if (expression === 'child') {
                    return ele;
                }
                return ele.querySelector(expression);
            }
            for (const exp of expression.split('%')) {
                if (exp.startsWith('parent')) {
                    const parentSelector = item['selector-items']?.[item['selector-items'].length - 2]?.['fetch-selector'];
                    ele = ele?.eleType === 'parent' ? ele : findELeBySelector('p', parentSelector, ele);
                    continue;
                }
                if (exp.startsWith('child')) {
                    if (ele?.eleType === 'parent') {
                        return null
                    }
                    continue;
                }
                const arr = exp.split('@').map(v => v.trim());
                if (arr.length < 1 || !this.grammarCharacters.has(arr[0])) {
                    continue
                }
                ele = isNaN(parseInt(arr[1])) ? findELeBySelector(arr[0], arr.slice(1).join(''), ele) : findEleByNum(arr[0], arr[1], ele);
                if (!ele) {
                    return null;
                }
            }
            return ele;
        },
        fetchReplaceVarsRex: /\{(.*?)}/g,

        replaceVars2Format(vars, str) {
            return str.replace(this.fetchReplaceVarsRex, (substring, name) => vars?.[name] ?? substring);
        },
        extractValue(varEle, item, param = {}) {
            let returnFn = () => {
                const t = item['fetch-data-type'] === 'text' ? 'innerText' : item['fetch-data-type'];
                return varEle?.[t] ?? '';
            }
            if (item['replacement-items'].length > 0) {
                varEle = varEle.cloneNode(true);
                if (item['fetch-data-type'] === 'text') {
                    varEle.innerHTML = varEle.innerText;
                    returnFn = () => varEle.innerHTML;
                }
                item['replacement-items'].forEach(rule => {
                    const r = this.replace(rule, varEle, true, param);
                    if (!r) {
                        return
                    }
                    varEle = r;
                });
            }
            return returnFn();
        },
        defaultReg: /\{(.*?)}/,
        // fetch vars
        getVars(ele, rule, fetchConf, vars = {}) {
            const el = this.anchor2Ele(rule, ele, fetchConf);
            if (!el) {
                let d = rule['default-value'];
                if (this.fetchReplaceVarsRex.test(d)) {
                    const name = this.defaultReg.exec(d)[1].split('|');
                    for (const k of name) {
                        if (vars.hasOwnProperty(k)) {
                            if (name.length > 1 && !vars[k]) {
                                continue;
                            }
                            d = vars[k];
                            break
                        }
                    }
                }
                vars[rule['super-fetch-name']] = d;
                log("query rule's value-selector fail", ele, rule['value-selector'], rule);
            } else {
                vars[rule['super-fetch-name']] = this.extractValue(el, rule, {
                    rule,
                    beforeQueryEle: ele,
                    afterQueryEle: el,
                    fetchParam: fetchConf,
                    vars
                });
            }

            const childVars = {};
            rule?.children?.forEach(item => this.getVars(el, item, fetchConf, childVars));
            Object.keys(childVars).forEach(k => vars[k] = childVars[k]);
            if (vars[rule['super-fetch-name']] && rule?.['fetch-format']) {
                vars[rule['super-fetch-name']] = this.replaceVars2Format(vars, rule['fetch-format']);
            }
            return vars;
        },


        setValue(target, value, item) {
            this.textNode.has(target.nodeName) ? this.setInputOrTextarea(target, value, item) : this.setEle(target, value, item);
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

        parseFetchRule(arr, rule = {}) {
            let valid = false;
            rule[''] = {};
            arr['super-fetch-items'].forEach(item => {
                rule[item['super-fetch-name']] = item;
                if (!item['value-selector']) {
                    log('value-selector emptied', item);
                    return;
                }
                valid = true
                rule[item['parent-super-name']]?.['children'] ?
                    rule[item['parent-super-name']]['children'].push(item)
                    : rule[item['parent-super-name']]['children'] = [item];
            });
            if (!valid) {
                return null;
            }

            return rule['']?.children ?? null;
        },

        replaceString(item, target, assign) {
            if (!item['replace_regex_pattern']) {
                assign(target.replace(item['searchValue'], item['replaceValue']));
                return;
            }
            //log(`'${target}'`,`'${target.replace(new RegExp(item['searchValue'],  item['replace_regex_pattern']), item['replaceValue'])}'`);
            assign(target.replace(new RegExp(item['searchValue'],
                    item['replace_regex_pattern'] === 'none' ? '' : item['replace_regex_pattern']),
                item['replaceValue']));
        },
        textNode: new Set(['INPUT', 'TEXTAREA']),
        replaceFn: {},
        replace(item, target, clone = false, eleParam = {}) {
            if (!item['searchValue']) {
                return
            }
            if (this.replaceFn?.[item['replace_target_type']]) {
                this.replaceFn[item['replace_target_type']](item, target, clone, eleParam);
                return
            }
            if (this.textNode.has(target.nodeName) && item['replace_target_type'] === 'text') {
                this.replaceString(item, target.value, val => target.value = val);
                return;
            }
            if (item.replace_target_type === 'text') {
                this.replaceString(item, target.innerText, v => target.innerText = v);
                return;
            }
            if (item['replace_target_type'] === 'remove element') {
                target.querySelectorAll(item['searchValue']).forEach(el => el.remove());
                return;
            }
            if (clone && item['replace_target_type'] === 'outerHTML') {
                const el = document.createElement('div');
                el.insertAdjacentElement('beforeend', target);
                this.replaceString(item, el.innerHTML, v => {
                    el.innerHTML = v;
                });
                return el.children[0];
            }
            this.replaceString(item, target[item['replace_target_type']], v => target[item['replace_target_type']] = v);
        },


        getFieldElement(name, target = null) {
            if ('*' === name && target) {
                return target;
            }
            const el = document.querySelector(name);
            if (el) {
                return el
            }
            let from = document.querySelector(`:where(.field-name,.sentence_field)[value='${name}']`);
            return findParent(from, '.form-item,.sentence_setting')?.querySelector('.spell-content,.field-value') ?? null;
        },


        buildFetchItem(data = null) {
            data['operate-type'] = data['operate-type'] ?? 'fetch';
            data['op'] = op;
            templateHelper?.[data['operate-type']] && templateHelper[data['operate-type']](data);
            data['fetch-operator'] = templateHelper.buildTemplateHTML(data['operate-type'], data);
            const div = document.createElement('div');
            div.innerHTML = templateHelper.buildTemplateHTML('fetch-base', data);
            div.querySelector('.operate-type').addEventListener('change', actionHelper.switchAction(data));
            div.querySelector('.fetch-active').addEventListener('change', fetchActive);
            return div.children[0];
        },
        switchAction(data) {
            return e => {
                const v = e.target.value;
                templateHelper?.[v] && templateHelper[v](data);
                findParent(e.target, '.fetch-item').querySelector('.fetch-action-container').innerHTML = templateHelper.buildTemplateHTML(v, data);
            }
        }
    };


    const actions = {
        // execute action
        dispatchAction(param, from = null, target = null) {
            this?.[param?.['operate-type']] && this[param['operate-type']](param, from, target);
        },
        fetch(param, from, target) {
            if (param['selector-items'].length < 1 || param?.['super-fetch-items']?.length < 1) {
                log('not have valid fetch rule!', param)
                return;
            }
            const rule = actionHelper.parseFetchRule(param);
            if (!rule) {
                log('not have valid fetch rule!')
                return;
            }
            const selectorItems = [...param['selector-items']];
            let ele = from, keep = [];
            while (true) {
                const selectorItem = selectorItems.splice(0, 1)?.[0];
                if (!selectorItem?.['fetch-selector']) {
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
        replacement(param, target) {
            param['replacement-items'].forEach(item => actionHelper.replace(item, target));
        },
        tag(param, target) {
            setTags(target, param);
        },
    };

    function ankiFetchData(param, target = null, from = null) {
        const targetField = buttonField(param);
        if (!target) {
            target = actionHelper.getFieldElement(targetField);
        }
        if (!from) {
            from = actionHelper.getFieldElement(param['fetch-field'], target)
        }

        if (target && from) {
            actions.dispatchAction(param, from, target);
            return
        }
        log(param);
    }

    function getAnkiFetchParams(targetField = '', activeFilter = true) {
        let params = [];
        if (getFetchItemEles().length < 1) {
            params = GM_getValue('fetch-items');
        } else {
            params = getFetchItemEles().map(convertFetchParam);
        }
        if (!params || params.length < 1) {
            return;
        }
        if (!targetField) {
            return params;
        }
        return params.filter(param => {
            const field = buttonField(param);
            if (activeFilter) {
                return param['fetch-active'] && (field === '*' || field === targetField);
            }
            return field === '*' || field === targetField;
        });
    }

    function ankiFetchClickFn(button) {
        const triggerField = button.parentElement.parentElement.querySelector('.sentence_field,.field-name').value.trim();
        const param = getAnkiFetchParams(triggerField, true);
        if (param.length < 1) {
            return;
        }
        const eleCache = {}, sequence = GM_getValue('sequentially-fetch', false);
        if (!sequence) {
            param.forEach(item => executeAction(item, eleCache));
            return;
        }
        const fetchItems = param.filterAndMapX(item => item['operate-type'] === 'fetch' ? item : false);
        if (!fetchItems) {
            return;
        }
        const from = actionHelper.getFieldElement(fetchItems[0]['fetch-field']);
        [...from.children].forEach(el => fetchItems.forEach(item => executeAction(item, eleCache, el)));
    }

    function executeAction(item, eleCache = {}, from = null) {
        const field = buttonField(item);
        let target = eleCache?.[field];
        from = from ? from : eleCache?.[item['fetch-field']];
        if (!target) {
            target = actionHelper.getFieldElement(field);
            eleCache[field] = target;
        }
        if (!from) {
            from = actionHelper.getFieldElement(item['fetch-field']);
            eleCache[item['fetch-field']] = from;
        }
        actions.dispatchAction(item, from, target);
    }

    const mapTitle = {
        'no file': '没有文件！',
        'redundantly import': '无需导入！',
        'super html extract and process processor': '超级html提取加工处理器',
        "can't parse rule file": '不能解析规则文件！',
        'import': '导入',
        'export': '导出',
        'fetch': '抓取',
        'right-operate': '右键选择执行一个操作',
        'keep-parent': '当子项不存在时取父项',
        'do-all': '一键执行全部操作',
        'replacement': '替换',
        'tag': '打标签',
        'fetch-name': '名称，只作为标识',
        'operate-type': '操作类型',
        'fetch-field': '提取的字段',
        'fetch-to-field': '提取到目标字段',
        'sequentially-fetch': '只对抓取操作项有效，尝试按内容顺序抓取，可能有性能及其它不未知问题',
        'parent-super-name': '父提取值的标识名',
        'fetch-selector': '选择器，多个时，前一个为后一个的父选择器，最后一个为锚选择器',
        'is_multiple': '是否有多个',
        'value-selector': '值选择器',
        'fetch-exclude-selector': '提取值需要排除的选择器',
        'fetch-join-selector': '组合选择器',
        'fetch-format': '提取的格式，可以使用{自身标识(即提取的值)或子项标识}，为空为时默认为 {自身标识}, ',
        'fetch-data-handle': '提取到后的操作',
        'fetch-data-type': '提取类型',
        'fetch-repeat': '不重复',
        'fetch-num': '提取的数量,默认0为全部',
        'fetch-value-replacement': '提取的值去除或替换,[=]前后分为表示要替换的值和替换值，多个用@@分隔，支持正则， 如 去掉·和将。替换为. 为 ·@@。[=].',
        'fetch-html-replacement': 'html去除或替换,[=]前后分为表示要替换的值和替换值，多个用@@分隔，支持正则， 如 去掉·和将。替换为. 为 ·@@。[=].，在提取为值之前执行',
        'fetch-value-trim': '提取的值去除首尾空白符如空格等',
        'fetch-value-replacement-ignore-case': '是否忽略大小写',
        'fetch-html-replacement-ignore-case': '是否忽略大小写',
        'tag-selector': '标签的选择器',
        'fetch-tag': '设置的标签',
        'fetch-active': '是否启用这个操作项',
        'fetch-delete': '删除此项',
        'fetch-copy': '复制此项',
        'fetch-add': '在此项后台添加一个操作项',
        'super-fetch-name': '提取值的标识名',
        'default-value': '默认值',
        'replace_target_type': '替换目标类型',
        'text': '文本',
        'add': '左键添加一个空白项，右键复制当前项',
        'innerHTML': 'innerHTML',
        'outerHTML': 'outerHTML',
        'searchValue': '替换或删除的目标,文本值或选择器',
        'replaceValue': '替换的值，当为删除时值为选择器',
        'remove element': '删除元素',
        'replace_regex_pattern': '正则替换模式如果是正则替换的化，为空则为普通替换',
        'cover': '覆盖',
        'append': '追加',
        'none': '啥都不干',
    };
    const allowFn = {
        htmlSpecial, leftTrim, rightTrim, trims,
        checked(value) {
            return value ? ' checked ' : '';
        },
        buildOption,
        lang(name) {
            return htmlSpecial(mapTitle?.[name] ?? name);
        }
    };

    function leftTrim(s, symbol) {
        if (!s || !symbol) {
            return s;
        }
        for (const str of symbol.split('')) {
            if (s[0] === str) {
                s = s.substring(1);
                return s
            }
        }
        return s;
    }

    function rightTrim(s, symbol) {
        if (!s || !symbol) {
            return s;
        }
        for (const str of symbol.split('')) {
            if (s.length >= 1 && str === s[s.length - 1]) {
                s = s.substring(0, s.length - 1);
                return s
            }
        }
        return s;
    }

    function trims(s, symbol = `('")`) {
        return rightTrim(leftTrim(s, symbol), symbol);
    }

    function getVarVal(vars, express, defaults = '') {
        if (!express.includes('.')) {
            return vars?.[express] ?? defaults;
        }
        return express.split('.').reduce((prev, cur) => prev?.[cur] ?? defaults, vars);
    }

    const op = {'fetch': mapTitle['fetch'], 'replacement': mapTitle['replacement'], 'tag': mapTitle['tag']};
    const handleOp = {'append': mapTitle['append'], 'cover': mapTitle['cover'], 'none': mapTitle['none']};
    const htmlType = {
        'text': mapTitle['text'],
        'remove element': mapTitle['remove element'],
        'innerHTML': mapTitle['innerHTML'],
        'outerHTML': mapTitle['outerHTML']
    };
    const templateHelper = {
        templateFnHook: {},
        templateCache: {},
        replaceRex: /\{\{(.*?)}}/g,
        buildTemplateHTML(template, vars = null) {
            let t = this.templateCache?.[template] ?? '';
            if (!t) {
                t = GM_getResourceText(template) ?? '';
                this.templateCache[template] = t;
            }
            if (!t) {
                return t
            }
            if (this.templateFnHook?.[template]) {
                t = this.templateFnHook[template](t, vars);
            }
            return t.replace(this.replaceRex, (substring, name) => {
                const names = name.split('|');
                let val = getVarVal(vars, names[0]);
                if (names.length < 2) {
                    return val;
                }
                for (let fn of names.splice(1)) {
                    if (fn === 'lang') {
                        return allowFn.lang(names[0]);
                    }
                    const fns = fn.split('(');
                    const param = [];
                    if (fns.length > 1) {
                        fn = fns[0].trim();
                        trims(fns[1], ')')
                            .split(',')
                            .forEach(a =>
                                (a = a.trim(), param.push(getVarVal(vars, a, trims(a))))
                            );
                    }
                    if (val?.[fn]) {
                        val = val[fn](...param);
                        continue;
                    }

                    if (!allowFn?.[fn]) {
                        return val;
                    }
                    val = allowFn[fn](val, ...param);
                }
                return val;
            });
        },
        replacement(data) {
            data['replacement-item-html'] = (data?.['replacement-items'] ?? [{}])
                .map(item =>
                    templateHelper.buildTemplateHTML('replacement-item', {
                        ...item,
                        htmlType,
                    })
                ).join('\n');
            return data['replacement-item-html'];
        },
        fetch(data) {
            data['fetch-chain-html'] = (data?.['selector-items'] ?? [{}])
                .map(item => templateHelper.buildTemplateHTML('selector-chain', item))
                .join('\n');

            data['handleOp'] = handleOp;
            data['super-fetch-item-html'] = (data?.['super-fetch-items'] ?? [{}]).map(item =>
                templateHelper.buildTemplateHTML('fetch-item', {
                    ...item, htmlType,
                    'replacement-item-html': templateHelper.replacement(item),
                })
            ).join('\n')
            return data;
        }
    };

    function setEleDrag(ele, selector, config = {}) {
        let currentItem;
        const turnDrag = onoff => ele.querySelectorAll(selector).forEach(item => item.draggable = onoff)
        const evenFn = {
            dragstart(e) {
                e.dataTransfer.effectAllowed = 'move';
                currentItem = e.target;
                currentItem.classList.add('moving');
            },
            dragenter(e) {
                e.preventDefault();
                const children = [...ele.querySelectorAll(selector)];
                if (e.target === currentItem || children.length <= 1 || e.target === ele || !children.includes(e.target)) {
                    return
                }
                e.target.insertAdjacentElement('afterend', currentItem);
            },
            dragend(e) {
                currentItem.classList.remove('moving');
                saveFetchItems();
            },
            dragover(e) {
                e.preventDefault();
            },
            mousedown(ev) {
                if (ev.target.tagName === 'INPUT') {
                    turnDrag(false);
                }
            },
            mouseup(ev) {
                if (ev.target.tagName === 'INPUT') {
                    turnDrag(true);
                }
            },
            ...config
        }
        return on => {
            if (on) {
                turnDrag(true);
                Object.keys(evenFn).forEach(name => ele.addEventListener(name, evenFn[name]));
                return
            }
            Object.keys(evenFn).forEach(v => ele.removeEventListener(v, evenFn[v]));
            turnDrag(false);
        }
    }


    PushHookAnkiHtml((ankiContainer) => {
        const div = document.createElement('div');
        div.className = 'form-item fetch-sentence-container';
        div.innerHTML = templateHelper.buildTemplateHTML('fetch-form', {
            'sequentially-fetch': GM_getValue('sequentially-fetch', false),
        });
        setting = div.querySelector('.select-setting');
        const ty = new Set(['add', 'remove']);
        setting.addEventListener('click', evt => {
            if (!evt.target.dataset?.['op'] || !ty.has(evt.target.dataset.op)) {
                return
            }
            if (evt.target.dataset.op === 'remove') {
                eventFn.remove(evt);
                return;
            }
            eventFn.add(evt);
        });
        setting.addEventListener('contextmenu', evt => evt.target.dataset.op === 'add' && eventFn.copy(evt));

        ankiContainer.querySelector('#auto-sentence').parentElement.insertAdjacentElement('afterend', div);
    });
    return {
        ankiFetchClickFn,
        ankiFetchData,
        getAnkiFetchParams,
        arrayDiff: diff,
        setEleDrag,
        superFetchHook: {
            eventHook: eventFn,
            formProcessor,
            mapTitle, fetchActions: actions,
            fetchActionHelper: actionHelper,
            mergeMap: (obj, kv) => Object.keys(kv).forEach(k => obj[k] = kv[k]),
            hookLang: lang => Object.keys(lang).forEach(k => mapTitle[k] = lang[k]),
            lang: name => allowFn.lang(name),
            allowFn, op, htmlType, handleOp,
            buildChildrenHtmlFn: templateHelper,
        }
    }
})();