;(() => {

    PushHookAnkiStyle(`
    .fetch-sentence-container { display:flex; }
    .select-setting,.fetch-add { display:none;}
    .fetch-opera { display: grid;}
    .fetch-item { margin-top: 1rem; margin-left: 1rem; }
    .fetch-box { 
            display: inline-block;
            vertical-align: middle;
            margin-left: 0.2rem;
        }
    .fetch-dd { margin-left: 0rem; }
    .fetch-name {width: 7rem;}
    .fetch-format {width: 20rem}
    .fetch-bold-field {width: 17rem}
    .fetch-num { width:3rem}
    .moving {
            background: transparent;
            color: transparent;
            border: 1px dashed #ccc;
        }
    `);

    PushHookAnkiDidRender(addOrDelBtn);

    ['swal2-cancel swal2-styled',
        'swal2-confirm swal2-styled',
        'swal2-container swal2-center swal2-backdrop-hide'].forEach(className => {
        PushExpandAnkiInputButton(className, '', saveFetchItems);
    });

    const fetchFields = ['fetch-name', 'fetch-field', 'fetch-to-field', 'fetch-selector', 'fetch-parent-selector',
        'fetch-exclude-selector', 'fetch-join-selector', 'fetch-join-reverse', 'fetch-format', 'fetch-data-handle', 'fetch-repeat',
        'fetch-bold-field', 'fetch-num', 'fetch-active'];
    const specialFields = ['fetch-selector', 'fetch-parent-selector', 'fetch-bold-field',
        'fetch-exclude-selector', 'fetch-join-selector', 'fetch-format'];


    function findParent(ele, selector) {
        if (!ele || ele.tagName === 'HTML' || ele === document) {
            return null
        }
        if (ele.matches(selector)) {
            return ele
        }
        return findParent(ele.parentElement, selector)
    }

    function addOrDelBtn() {
        const fetchMap = {};
        const hadMap = {};
        for (const el of document.querySelectorAll('.fetch-sentence-field')) {
            let input = el.parentElement.parentElement.querySelector('.field-name,.sentence_field');
            hadMap[input.value] = el;
        }
        for (const ele of document.querySelectorAll('.fetch-to-field')) {
            const active = ele.parentElement.parentElement.parentElement.querySelector('.fetch-active').checked;
            if (!fetchMap.hasOwnProperty(ele.value)) {
                fetchMap[ele.value] = [[active, ele]]
            } else {
                fetchMap[ele.value].push([active, ele]);
            }
        }
        Object.keys(fetchMap).map(k => {
            let active = false;
            let title = [];
            fetchMap[k].map(v => {
                if (v[0]) {
                    active = true;
                }
                title.push(v[1].parentElement.parentElement.parentElement.querySelector('.fetch-name').value);
            });

            [...document.querySelectorAll('input.field-name,input.sentence_field')].filter(input => input.value === k).map(input => {
                if (hadMap.hasOwnProperty(k)) {
                    delete hadMap[k];
                }
                const btn = input.parentElement.querySelector(`.fetch-sentence-field`);
                if (active && btn) {
                    btn.title = `将提取${title.join(',')}`;
                    return;
                }
                if (active && !btn) {
                    const btn = document.createElement('button');
                    btn.innerHTML = `⚓`;
                    btn.className = 'fetch-sentence-field';
                    btn.title = `将提取${title.join(',')}`;
                    let op = input.parentElement.querySelector('.field-operate');
                    if (op) {
                        op.appendChild(btn);
                        return;
                    }
                    input.parentElement.parentElement.querySelector('.field-operate').appendChild(btn);
                    return
                }

                btn && btn.remove();
            });
            for (const k in hadMap) {
                hadMap[k].remove();
            }
        })

    }

    function fetchActive(ev) {
        const box = ev.target;
        const parent = box.parentElement.parentElement;
        const inp = parent.querySelector('.fetch-field');
        const targetField = parent.querySelector('.fetch-to-field');
        addOrDelBtn();
        if (!inp.value) {
            Swal.showValidationMessage('提取的字段不能为空！');
            inp.focus();
            box.checked = false;
            return
        }
        if (!targetField.value) {
            Swal.showValidationMessage('提取到目标的字段不能为空！');
            targetField.focus();
            box.checked = false;
        }
        saveFetchItems();
    }

    let setting, boldAll = false;

    function saveFetchItems() {
        const data = [...setting.children].map(item => convertFetchParam(item));
        data.length > 0 && GM_setValue('fetch-items', data);
    }

    function convertFetchParam(item) {
        const param = {};
        fetchFields.forEach(sel => {
            if (['fetch-num', 'fetch-data-handle'].includes(sel)) {
                param[sel] = parseInt(item.querySelector(`.${sel}`).value);
                return
            }
            if (['fetch-repeat', 'fetch-active', 'fetch-join-reverse'].includes(sel)) {
                param[sel] = item.querySelector(`.${sel}`).checked;
                return
            }

            if (specialFields.includes(sel)) {
                param[sel] = item.querySelector(`.${sel}`).value;
                param[sel] = decodeHtmlSpecial(param[sel]);
                return;
            }
            param[sel] = item.querySelector(`.${sel}`).value.trim();
        });
        return param
    }


    function setValue(target, valElement, format, way, isRepeat = false, joinEle = null, boldFieldValue = '') {
        if (!valElement && !joinEle) {
            return
        }
        let sw = false;
        if (!valElement && joinEle) {
            valElement = joinEle;
            joinEle = null;
            sw = true;
        }

        const setInput = (input, value, isAppend, isRepeat) => {
            value = value.innerText.trim();
            if (format) {
                let join = '';
                if (joinEle) {
                    join = joinEle.innerText.trim();
                }
                value = sw ? format.replaceAll('{$join}', value).replaceAll('{$value}', '') :
                    format.replaceAll('{$value}', value).replaceAll('{$join}', join);
            }
            if (!isRepeat && input.value.includes(value)) {
                return;
            }
            input.value = isAppend ? (input.value + value) : value;
        }

        const setDiv = (div, value, isAppend, isRepeat) => {
            let v = value.innerText.trim();
            if (!isRepeat && div.innerText.includes(v)) {
                return
            }
            const bold = (sentence) => {
                if (!boldFieldValue) {
                    return sentence;
                }
                let words, format;
                if (Array.isArray(boldFieldValue)) {
                    words = boldFieldValue[0].split(' ');
                    format = boldFieldValue[1];
                } else {
                    words = boldFieldValue.split(' ');
                }

                words = words.sort((a, b) => a.length <= b.length ? 1 : -1);
                const formats = format ? format.split('{$bold}').join('\$&') : '<b>\$&</b>';
                for (const word of words) {
                    const l = sentence.length;
                    sentence = sentence.replaceAllX(word, formats, 'gi');
                    if (l !== sentence.length && !boldAll) {
                        break
                    }
                }

                return sentence;
            }
            const set = (di) => {
                di.innerHTML = bold(di.innerHTML);
                if (di.children.length > 0) {
                    isAppend ? [...di.children].forEach(v => div.appendChild(v)) : (div.innerHTML = di.innerHTML);
                    return;
                }
                div.innerHTML = isAppend ? div.insertAdjacentHTML('afterend', di.innerHTML) : di.innerHTML;
            }
            if (format) {
                let join = '';
                if (joinEle) {
                    join = joinEle.innerText.trim();
                }
                const v = sw ?
                    format.replaceAll('{$join}', value.innerText.trim()).replaceAll('{$value}', '') :
                    format.replaceAll('{$value}', value.innerText.trim()).replaceAll('{$join}', join);
                const di = document.createElement('div');
                di.innerHTML = v;
                if (!isRepeat && div.innerText.includes(di.innerText)) {
                    return
                }
                set(di);
                return;
            }
            //joinEle.innerHTML = bold(joinEle.innerHTML);
            value.innerHTML = bold(value.innerHTML);
            if (joinEle) {
                isAppend ? (div.appendChild(joinEle) , div.appendChild(value)) : (div.innerHTML = joinEle.outerHTML + value.outerHTML);
                return;
            }
            isAppend ? div.appendChild(value) : (div.innerHTML = value.outerHTML);
        }

        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            const value = target.value;
            if (way === 3 && value) {
                return;
            }
            setInput(target, valElement, way === 1, isRepeat);
            return;
        }
        setDiv(target, valElement, way === 1, isRepeat)
    }

    function fetchLimit(eles, num) {
        if (num <= 0) {
            return eles;
        }
        return [...eles].slice(0, num)
    }

    function findELeBySelector(t, sel, el) {
        if (!el) {
            return null;
        }
        if (t === 's') {
            return el.querySelector(sel);
        }
        let ele = el;
        do {
            if (!ele) {
                return null;
            }
            switch (t) {
                case 'p':
                    ele = ele.parentElement;
                    break;
                case 'ns':
                    ele = ele.nextElementSibling;
                    break
                case 'ps':
                    ele = ele.previousSibling;
                    break;
                default:
                    return null
            }
            if (ele && ele.matches(sel)) {
                return ele;
            }
        } while (ele)
        return ele;
    }

    function findEleByNum(t, num, el) {
        if (!el) {
            return null;
        }
        if (num < 1) {
            return null
        }
        let ele = el;
        do {
            if (!ele) {
                return null;
            }
            switch (t) {
                case 'p':
                    ele = ele.parentElement;
                    break;
                case 'ns':
                    ele = ele.nextElementSibling;
                    break
                case 'ps':
                    ele = ele.previousSibling;
                    break;
                default:
                    return null
            }

        } while (--num)
        return ele;
    }

    function parseSelector(expression, joinEle) {
        let ele = joinEle;
        for (const exp of expression.split('%')) {
            const arr = exp.split('@').map(v => v.trim());
            if (arr.length < 1 || !['s', 'ps', 'p', 'ns'].includes(arr[0])) {
                continue
            }
            ele = isNaN(parseInt(arr[1])) ? findELeBySelector(arr[0], arr.slice(1).join(''), ele) : findEleByNum(arr[0], arr[1], ele)
        }

        return ele === joinEle ? null : ele;

    }

    function removeEle(ele, selector) {
        if (!selector) {
            return
        }
        ele.querySelectorAll(selector).forEach(el => el.remove());
    }

    function fetchData(item, from, target) {
        const param = convertFetchParam(item);
        let boldFieldValue = '';
        if (param['fetch-bold-field']) {
            const fields = param['fetch-bold-field'].split('@@');
            for (const input of document.querySelectorAll('input.field-name')) {
                if (input => input.value === fields[0]) {
                    const ip = input.nextElementSibling;
                    if (ip && ip.matches('input.field-value')) {
                        boldFieldValue = ip.value;
                        if (fields.length > 1) {
                            const f = fields[1].split('%%');
                            if (f.length < 1) {
                                break;
                            }
                            if (f.length === 1 && f[0].includes('{$bold}')) {
                                boldFieldValue = [boldFieldValue, f[0]];
                                break;
                            }
                            boldFieldValue = [boldFieldValue.split(f[0].replaceAll('`', '')).join(' '), f[1]];
                        }
                        break
                    }
                }
            }
        }
        from = from.parentElement;
        if (!param['fetch-parent-selector']) {
            for (const el of fetchLimit(from.querySelectorAll(param['fetch-selector']), param['fetch-num'])) {
                const ele = el.cloneNode(true);
                removeEle(ele, param['fetch-exclude-selector']);
                setValue(target, ele, param['fetch-format'], param['fetch-data-handle'], !param['fetch-repeat'], null, boldFieldValue);
            }
            return;
        }
        [...from.querySelectorAll(param['fetch-parent-selector'])].forEach(parent => {
            if (param['fetch-join-selector']) {
                const joinSel = param['fetch-join-selector'].split('`');
                if (param['fetch-join-reverse']) {
                    for (let value of fetchLimit(parent.querySelectorAll(param['fetch-selector']), param['fetch-num'])) {
                        let joinEle = parseSelector(joinSel[0], value);
                        if (joinEle) {
                            joinEle = joinEle.cloneNode(true);
                            if (joinSel.length > 1) {
                                removeEle(joinEle, joinSel[1]);
                            }
                        }
                        const ele = value.cloneNode(true);
                        removeEle(ele, param['fetch-exclude-selector']);
                        setValue(target, ele, param['fetch-format'], param['fetch-data-handle'], !param['fetch-repeat'], joinEle, boldFieldValue);
                    }
                    return;
                }
                for (let joinEle of fetchLimit(parent.querySelectorAll(joinSel[0]), param['fetch-num'])) {
                    let ele = parseSelector(param['fetch-selector'], joinEle);
                    if (ele) {
                        ele = ele.cloneNode(true);
                        removeEle(ele, param['fetch-exclude-selector'])
                    }
                    joinEle = joinEle.cloneNode(true);
                    if (joinSel.length > 1) {
                        removeEle(joinEle, joinSel[1]);
                    }
                    setValue(target, ele, param['fetch-format'], param['fetch-data-handle'], !param['fetch-repeat'], joinEle, boldFieldValue);
                }
                return
            }

            for (const el of fetchLimit(parent.querySelectorAll(param['fetch-selector']), param['fetch-num'])) {
                const ele = el.cloneNode(true);
                removeEle(ele, param['fetch-exclude-selector']);
                setValue(target, ele, param['fetch-format'], param['fetch-data-handle'], !param['fetch-repeat'], null, boldFieldValue);
            }
        })
    }


    PushExpandAnkiInputButton('fetch-delete', '', (e) => {
        e.target.parentElement.parentElement.remove();
    });
    PushExpandAnkiInputButton('fetch-sentence-field', '', (e) => {
        const field = e.target.parentElement.parentElement.querySelector('.sentence_field,.field-name');
        for (const toFieldInput of document.querySelectorAll('.fetch-to-field')) {
            const item = findParent(toFieldInput, '.fetch-item');
            const selector = item.querySelector('.fetch-selector');
            const from = item.querySelector('.fetch-field');
            if (toFieldInput.value !== field.value || !from.value || !selector.value || !item.querySelector('.fetch-active').checked) {
                continue
            }
            let fromEle = [...document.querySelectorAll('.field-name,.sentence_field')].filter(el => el.value === from.value);
            fromEle = fromEle ? findParent(fromEle[0], '.form-item,.sentence_setting').querySelector('.spell-content,.field-value') : null;
            if (!fromEle) {
                continue;
            }
            fetchData(item, fromEle, e.target.parentElement.parentElement.querySelector('.spell-content,.field-value'))
        }
    }, '', (ev) => {
        ev.preventDefault();
        boldAll = true
        ev.target.click();
        boldAll = false;
    });

    const mapTitle = {
        'fetch-name': '名称，只作为标识',
        'fetch-field': '提取的字段',
        'fetch-to-field': '提取到目标字段',
        'fetch-selector': '提取值的选择器',
        'fetch-parent-selector': '父选择器',
        'fetch-exclude-selector': '提取值需要排除的选择器',
        'fetch-join-selector': '组合选择器',
        'fetch-join-reverse': '反转组合选择器',
        'fetch-format': '提取的格式，为空为原值，{$join}为组合选择器的值， {$value}为提取的值',
        'fetch-data-handle': '提到后的操作',
        'fetch-repeat': '是否去重',
        'fetch-bold-field': htmlSpecial('加粗的字段，如有多个值，可以指定分隔符如 正面@@`,`%%<b>{$bold}</b> %%后为格式'),
        'fetch-num': '提取的数量,默认0为全部',
        'fetch-active': '是否启用这个提取项',
        'fetch-delete': '删除此项',
    };
    const de = {};
    Object.keys(mapTitle).forEach(k => {
        de[k] = '';
        de['fetch-num'] = 0;
        de['fetch-repeat'] = true;
        de['fetch-active'] = false;
        de['fetch-data-handle'] = '1';
    });

    function buildFetchItem(data = null) {
        specialFields.forEach(v => data[v] = htmlSpecial(data[v]));
        const div = document.createElement('div');

        div.innerHTML = `
                <div class="fetch-item" draggable="true">
                    <span class="fetch-box">
                           <input class="fetch-name" value="${data['fetch-name']}" title="${mapTitle['fetch-name']}" placeholder="${mapTitle['fetch-name']}">
                    </span>
                    <span class="fetch-box">
                        <dd class="fetch-dd">
                            <input name="fetch-field" value="${data['fetch-field']}" class="fetch-field" title="${mapTitle['fetch-field']}" placeholder="${mapTitle['fetch-field']}">
                            <input name="fetch-to-field" value="${data['fetch-to-field']}" class="fetch-to-field" title="${mapTitle['fetch-to-field']}" placeholder="${mapTitle['fetch-to-field']}">
                        </dd>
                        <dd class="fetch-dd">
                            <input name="fetch-selector" value="${data['fetch-selector']}" class="fetch-selector" title="${mapTitle['fetch-selector']}" placeholder="${mapTitle['fetch-selector']}">
                            <input name="fetch-parent-selector" value="${data['fetch-parent-selector']}" class="fetch-parent-selector" title="${mapTitle['fetch-parent-selector']}" placeholder="${mapTitle['fetch-parent-selector']}">
                        </dd>
                        <dd class="fetch-dd">
                            <input name="fetch-exclude-selector" value="${data['fetch-exclude-selector']}" class="fetch-exclude-selector" title="${mapTitle['fetch-exclude-selector']}" placeholder="${mapTitle['fetch-exclude-selector']}">
                            <input name="fetch-join-selector" value="${data['fetch-join-selector']}" class="fetch-join-selector" title="${mapTitle['fetch-join-selector']}" placeholder="${mapTitle['fetch-join-selector']}">
                            <input type="checkbox" ${data['fetch-join-reverse'] ? 'checked' : ''} name="fetch-join-reverse" class="fetch-join-reverse" title="${mapTitle['fetch-join-reverse']}" placeholder="${mapTitle['fetch-join-reverse']}">
                        </dd>
                        <dd class="fetch-dd">
                            <input name="fetch-format" value="${data['fetch-format']}" class="fetch-format" title="${mapTitle['fetch-format']}" placeholder="${mapTitle['fetch-format']}">
                            <select name="fetch-data-handle" class="fetch-data-handle" title="${mapTitle['fetch-data-handle']}">
                                ${buildOption([['1', '追加'], ['2', '覆盖'], ['3', '不处理']], data['fetch-data-handle'], 0, 1)}
                            </select>                          
                        </dd>
                        <dd class="fetch-dd">
                               <input name="fetch-bold-field" value="${data['fetch-bold-field']}" class="fetch-bold-field" title="${mapTitle['fetch-bold-field']}" placeholder="${mapTitle['fetch-bold-field']}">
                               <input name="fetch-num" step="1" min="0" value="${data['fetch-num']}" class="fetch-num" type="number" title="${mapTitle['fetch-num']}" placeholder="${mapTitle['fetch-num']}">
                               <input type="checkbox" ${data['fetch-repeat'] ? 'checked' : ''} name="fetch-repeat" class="fetch-repeat" title="${mapTitle['fetch-repeat']}" placeholder="${mapTitle['fetch-repeat']}">
                        </dd>
                    </span>     
                    <span class="fetch-box">
                        <input type="checkbox" ${data['fetch-active'] ? 'checked' : ''} name="fetch-active" class="swal2-checkbox fetch-active" title="${mapTitle['fetch-active']}" placeholder="${mapTitle['fetch-active']}">
                        <button class="fetch-delete" title="${mapTitle['fetch-delete']}">➖</button>
                    </span>                  
                </div>
        `;
        div.querySelector('.fetch-active').addEventListener('change', fetchActive);
        return div.children[0];
    }

    PushExpandAnkiInputButton('fetch-add', '', (e) => {
        e.target.parentElement.nextElementSibling.appendChild(buildFetchItem({...de}));
    });
    PushHookAnkiHtml((ankiContainer) => {
        const div = document.createElement('div');
        div.className = 'form-item fetch-sentence-container';
        div.innerHTML = `
            <div class="fetch-opera">
                <label for="fetch" class="form-label">提取词典的句子</label>
                <input type="checkbox" class="swal2-checkbox" name="fetch" id="fetch" title="显示提取词典设置">
                <button class="fetch-all" title="一键全部提取">🕸️</button>
                <button class="fetch-add" title="添加提取项">➕</button>
            </div>
            <div class="select-setting"></div>
        `;
        let fetchItems = GM_getValue('fetch-items', [{...de}]);
        fetchItems = fetchItems.length > 0 ? fetchItems : [{...de}];
        setting = div.querySelector('.select-setting');
        let currentItem;

        const startDrag = (e) => {
            e.dataTransfer.effectAllowed = 'move';
            currentItem = e.target;
            currentItem.classList.add('moving');
        };
        const enterDrag = (e) => {
            e.preventDefault();
            if (e.target === currentItem || setting.children.length <= 1 || e.target === setting || ![...setting.children].includes(e.target)) {
                return
            }
            let liArray = Array.from(setting.childNodes);
            let currentIndex = liArray.indexOf(currentItem);
            let targetindex = liArray.indexOf(e.target);
            if (currentIndex < targetindex) {
                setting.insertBefore(currentItem, e.target.nextElementSibling);
            } else {
                setting.insertBefore(currentItem, e.target);
            }
        };
        const endDrag = (e) => {
            currentItem.classList.remove('moving');
            saveFetchItems();
        };
        const overDrag = (e) => {
            e.preventDefault();
        };
        const turnDrag = (onoff) => {
            setting.querySelectorAll('.fetch-item').forEach(item => item.draggable = onoff);
        };
        setting.addEventListener('mousedown', (ev) => {
            if (ev.target.tagName === 'INPUT') {
                turnDrag(false);
            }
        });
        setting.addEventListener('mouseup', (ev) => {
            if (ev.target.tagName === 'INPUT') {
                turnDrag(true);
            }
        });
        setting.addEventListener('dragstart', startDrag);
        setting.addEventListener('dragenter', enterDrag);
        setting.addEventListener('dragend', endDrag);
        setting.addEventListener('dragover', overDrag);

        fetchItems.forEach(item => setting.appendChild(buildFetchItem(item)));

        [...div.querySelectorAll('.fetch-active')].map(f => f.addEventListener('change', fetchActive));

        div.querySelector('.fetch-all').addEventListener('click', () => {
            [...document.querySelectorAll('.fetch-sentence-field')].forEach(button => button.click());
        });

        div.querySelector('#fetch').addEventListener('change', function (e) {
            const add = findParent(this, '.fetch-opera').querySelector('.fetch-add');
            if (this.checked) {
                add.style.display = 'block';
                this.parentElement.nextElementSibling.style.display = 'block';
                return
            }
            add.style.display = 'none';
            this.parentElement.nextElementSibling.style.display = 'none';
        })
        const n = ankiContainer.querySelector('#auto-sentence');
        n.parentElement.parentElement.insertBefore(div, n.parentElement.nextElementSibling);
    });
})()