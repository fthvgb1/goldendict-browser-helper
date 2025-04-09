;const {
    addAnki,
    anki,
    queryAnki,
    PushAnkiBeforeSaveHook,
    PushExpandAnkiRichButton,
    PushExpandAnkiInputButton,
    PushHookAnkiStyle, PushHookAnkiHtml, PushHookAnkiClose, PushHookAnkiDidRender
} = (() => {
    let ankiHost = GM_getValue('ankiHost', 'http://127.0.0.1:8765');
    let richTexts = [];
    let existsNoteId = 0;
    const setExistsNoteId = (id) => {
        existsNoteId = id;
        const update = document.querySelector('#force-update');
        if (id > 0) {
            update.parentElement.style.display = 'block';
        } else {
            update.parentElement.style.display = 'none';
            update.checked = false;
        }
    }
    const spellIconsTtf = GM_getResourceURL('spell-icons-ttf');
    const spellIconsWoff = GM_getResourceURL('spell-icons-woff');
    const spellCss = GM_getResourceText("spell-css")
        .replace('chrome-extension://__MSG_@@extension_id__/fg/font/spell-icons.ttf', spellIconsTtf)
        .replace('chrome-extension://__MSG_@@extension_id__/fg/font/spell-icons.woff', spellIconsWoff);
    const frameCss = GM_getResourceText("frame-css");
    const diagStyle = GM_getResourceText('diag-style');
    const hookFns = [];

    function PushAnkiBeforeSaveHook(...call) {
        hookFns.push(...call);
    }

    PushIconAction && PushIconAction({
        name: 'anki',
        icon: 'icon-anki',
        image: GM_getResourceURL('icon-anki'),
        trigger: (t) => {
            addAnki(getSelectionElement(), tapKeyboard).catch(res => console.log(res));
        }
    });

    let createHtml = html => html;
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
        window.trustedTypes.createPolicy('default', {
            createHTML: (string, sink) => string
        });
        createHtml = html => window.trustedTypes.defaultPolicy.createHTML(html);
    }

    async function queryAnki(expression) {
        let {result, error} = await anki('findNotes', {
            query: expression
        })
        if (error) {
            throw error;
        }
        if (result.length < 1) {
            return null
        }
        const res = await anki('notesInfo', {
            notes: result
        })
        if (res.error) {
            throw res.error;
        }
        return res.result;
    }

    function getSearchType(ev, type = null) {
        const value = ev.target.parentElement.previousElementSibling.value.trim();
        const field = ev.target.parentElement.parentElement.querySelector('.field-name').value;
        const deck = document.querySelector('#deckName').value;
        const sel = document.createElement('select');
        const inputs = ev.target.parentElement.previousElementSibling;
        sel.name = inputs.name;
        sel.className = inputs.className;
        const precision = `deck:${deck} "${field}:${value}"`;
        const str = value.split(' ');
        const vague = str.length > 1 ? str.map(v => `${field}:*${v}*`).join(' ') : `${field}:*${value}*`;
        const deckVague = `deck:${deck} ` + vague;
        if (type !== null) {
            return [vague, deckVague, precision, value][type];
        }
        const searchType = GM_getValue('searchType', 0);
        const m = {};
        const nbsp = '&nbsp;'.repeat(5);
        const options = [
            [vague, `模糊不指定组牌查询:   ${nbsp}${vague}`],
            [deckVague, `模糊指定组牌查询:    ${nbsp}${deckVague}`],
            [htmlSpecial(precision), `精确查询:    ${nbsp}${precision}`],
            [value, `自定义查询:    ${nbsp}${value}`],
        ].map((v, i) => {
            if (i === searchType) {
                const vv = v[1].split(':')[0];
                v[1] = v[1].replace(vv, vv + ' (默认)');
            }
            m[v[0]] = i;
            return v;
        });
        return {options, m}
    }

    const contextMenuFns = {
        'anki-search': async (ev) => {
            ev.preventDefault();
            const sel = document.createElement('select');
            const inputs = ev.target.parentElement.previousElementSibling;
            sel.name = inputs.name;
            sel.className = inputs.className;
            const {options, m} = getSearchType(ev);
            sel.innerHTML = buildOption(options, m[GM_getValue('searchType', 0)], 0, 1);
            inputs.parentElement.replaceChild(sel, inputs);
            sel.focus();
            sel.addEventListener('blur', () => {
                GM_setValue('searchType', m[sel.value]);
                searchAnki(ev, decodeHtmlSpecial(sel.value), inputs, sel);
            })
            sel.addEventListener('change', () => {
                GM_setValue('searchType', m[sel.value]);
                searchAnki(ev, decodeHtmlSpecial(sel.value), inputs, sel);
            })
        },
        'action-copy': async (ev) => {
            ev.preventDefault();
            const ele = ev.target.parentElement.previousElementSibling.querySelector('.spell-content');
            const item = new ClipboardItem({
                'text/html': new Blob([ele.innerHTML], {type: 'text/html'}),
                'text/plain': new Blob([ele.innerHTML], {type: 'text/plain'}),
            })
            await navigator.clipboard.write([item]).catch(console.log)
        }
    }
    const clickFns = {
        'card-delete': async () => {
            if (confirm('确定删除么？')) {
                const {error} = await anki('deleteNotes', {notes: [existsNoteId]});
                if (error) {
                    Swal.showValidationMessage(error);
                    return
                }
                setExistsNoteId(0);
            }
        },
        'anki-search': (ev) => {
            const express = getSearchType(ev, GM_getValue('searchType', 0));
            const inputs = ev.target.parentElement.previousElementSibling;
            searchAnki(ev, express, inputs);
        },
        'word-wrap-first': (ev) => {
            const ed = ev.target.parentElement.previousElementSibling.querySelector('.spell-content');
            const b = ed.ownerDocument.createElement('br');
            ed.children.length > 0 ? ed.insertBefore(b, ed.children[0]) : ed.innerHTML = `<br>${ed.innerHTML}`;
            ed.focus();
        },
        'word-wrap-last': (ev) => {
            const edt = ev.target.parentElement.previousElementSibling.querySelector('.spell-content');
            const br = edt.ownerDocument.createElement('br');
            edt.appendChild(br);
        },
        'upperlowercase': (ev) => {
            const input = ev.target.parentElement.previousElementSibling;
            if (input.value === '') {
                return
            }
            const stats = input.dataset.stats;
            switch (stats) {
                case 'upper':
                    input.value = input.dataset.value;
                    input.dataset.stats = '';
                    break
                case 'lower':
                    input.value = input.value.toUpperCase();
                    input.dataset.stats = 'upper';
                    break
                default:
                    input.dataset.value = input.value;
                    input.value = input.value.toLowerCase();
                    input.dataset.stats = 'lower';
                    break
            }
        },
        'lemmatizer': (ev) => {
            const inputs = ev.target.parentElement.previousElementSibling;
            const words = inputs.value.split(' ');
            const word = inputs.value.split(' ')[0].toLowerCase();
            if (word === '') {
                return
            }
            const origin = lemmatizer.only_lemmas_withPos(word);
            if (origin.length < 1) {
                return
            }
            const last = words.length > 1 ? (' ' + words.slice(1).join(' ')) : '';
            if (origin.length === 1) {
                inputs.value = origin[0][0] + last;
                return
            }
            let wait = origin[0][0];
            [...origin].splice(1).map(v => wait = v[0] === origin[0][0] ? wait : v[0]);
            if (wait === origin[0][0]) {
                inputs.value = origin[0][0] + last
                return;
            }
            const all = origin.map(v => v[0] + last).join(' ');
            const ops = [...origin.map(v => [v[0] + last, `${v[1]}:${v[0]} ${last}`]), [all, all]];
            const options = buildOption(ops, '', 0, 1);
            const sel = document.createElement('select');
            sel.name = inputs.name;
            sel.className = inputs.className;
            sel.innerHTML = options;
            inputs.parentElement.replaceChild(sel, inputs);
            sel.focus();
            sel.onblur = () => {
                inputs.value = sel.value;
                sel.parentElement.replaceChild(inputs, sel);
            }
        },
        'text-clean': (ev) => {
            ev.target.parentElement.previousElementSibling.querySelector('.spell-content').innerHTML = '';
        },
        'paste-html': (ev, tapKeyboard) => {
            ev.target.parentElement.previousElementSibling.querySelector('.spell-content').focus();
            tapKeyboard && tapKeyboard('ctrl v')
        },
        'action-switch-text': (ev) => {
            const el = ev.target.parentElement.previousElementSibling.querySelector('.spell-content');
            if (el.tagName === 'DIV') {
                const text = el.innerHTML
                el.outerHTML = `<textarea class="${el.className}">${text}</textarea>`;
                ev.target.title = '切换为富文本'
            } else {
                const text = el.value
                el.outerHTML = `<div class="${el.className}" contenteditable="true">${text}</div>`;
                ev.target.title = '切换为textarea'
            }
        },
        'minus': (ev) => {
            ev.target.parentElement.parentElement.parentElement.removeChild(ev.target.parentElement.parentElement);
        },
        "action-copy": async (ev) => {
            const ele = ev.target.parentElement.previousElementSibling.querySelector('.spell-content');
            const html = await checkAndStoreMedia(ele.innerHTML);
            const item = new ClipboardItem({
                'text/html': new Blob([html], {type: 'text/html'}),
                'text/plain': new Blob([html], {type: 'text/plain'}),
            })
            await navigator.clipboard.write([item]).catch(console.log)
        },
    };

    async function searchAnki(ev, queryStr, inputs, sels = null) {
        const field = ev.target.parentElement.parentElement.querySelector('.field-name').value;
        let result;
        try {
            result = await queryAnki(queryStr);
            if (!result) {
                setExistsNoteId(0);
                sels && sels.parentElement.replaceChild(inputs, sels);
                return
            }
        } catch (e) {
            Swal.showValidationMessage(e);
            return
        }
        if (result.length === 1) {
            if (sels && sels.parentElement) {
                sels.parentElement.replaceChild(inputs, sels);
            }
            await showAnkiCard(result[0]);
            return
        }
        const sel = document.createElement('select');
        sel.name = inputs.name;
        sel.className = inputs.className;
        const values = {};
        const options = result.map(v => {
            values[v.fields[field].value] = v;
            return [v.fields[field].value, v.fields[field].value];
        });
        sel.innerHTML = buildOption(options, '', 0, 1);
        const ele = (sels && sels.parentElement) ? sels : inputs;
        ele.parentElement.replaceChild(sel, ele);
        sel.focus();
        const changeFn = async () => {
            inputs.value = sel.value;
            await showAnkiCard(values[sel.value]);
        }
        const blurFn = async () => {
            sel.removeEventListener('change', changeFn);
            inputs.value = sel.value;
            sel.parentElement.replaceChild(inputs, sel);
            await showAnkiCard(values[sel.value]);
        };
        sel.addEventListener('change', changeFn);
        sel.addEventListener('blur', blurFn);
        await showAnkiCard(result[0]);
    }

    async function showAnkiCard(result) {
        setExistsNoteId(result.noteId);
        document.querySelector('#tags').value = result.tags.length >= 1 ? result.tags.join(',') : '';
        const res = await anki('cardsInfo', {cards: [result.cards[0]]});
        if (res.error) {
            console.log(res.error);
        }
        if (res.result.length > 0) {
            document.querySelector('#deckName').value = res.result[0].deckName;
        }
        document.querySelector('#model').value = result.modelName;
        const sentenceInput = document.querySelector('#sentence_field');
        const sentence = sentenceInput.value;
        const fields = {
            [sentence]: sentenceInput,
        };
        [...document.querySelectorAll('#shadowFields input.field-name')].map(input => fields[input.value] = input);

        for (const k of Object.keys(result.fields)) {
            if (!fields.hasOwnProperty(k)) {
                continue;
            }
            const v = result.fields[k].value;
            if (fields[k].nextElementSibling.tagName === 'SELECT') {
                continue;
            }
            if (fields[k].nextElementSibling.tagName === 'INPUT') {
                fields[k].nextElementSibling.value = v;
                continue;
            }
            const div = document.createElement('div');
            div.innerHTML = v;
            for (const img of [...div.querySelectorAll('img')]) {
                if (!img.src) {
                    continue;
                }
                const srcs = (new URL(img.src)).pathname.split('/');
                const src = srcs[srcs.length - 1];
                let suffix = 'png';
                const name = src.split('.');
                suffix = name.length > 1 ? name[1] : suffix;
                const {result, error} = await anki('retrieveMediaFile', {'filename': src});
                if (error) {
                    console.log(error);
                    continue
                }
                if (!result) {
                    continue;
                }
                img.dataset.fileName = src;
                img.src = `data:image/${suffix};base64,` + result;
            }
            fields[k].parentElement.querySelector('.spell-content').innerHTML = div.innerHTML;
        }
    }

    function buildInput(rawStr = false, field = '', value = '', checked = false) {
        const li = document.createElement('div');
        const checkeds = checked ? 'checked' : '';
        li.className = 'form-item'
        li.innerHTML = createHtml(`
            <input name="shadow-form-field[]" placeholder="字段名" value="${field}" class="swal2-input field-name">
            <input name="shadow-form-value[]" value="${value}" placeholder="字段值" class="swal2-input field-value"> 
            <div class="field-operate">
                <button class="minus">➖</button>
                <input type="radio" title="选中赋值" ${checkeds} name="shadow-form-defaut[]">
                <button class="lemmatizer" title="lemmatize查找单词原型">📟</button>
                <button class="anki-search" title="search anki 左健搜索 右键选择搜索模式">🔍</button>
                <button class="upperlowercase" title="大小写转换">🔡</button>
                ${inputButtons.join('\m')} ${inputButtonFields[field] ? inputButtonFields[field].join('\n') : ''}

            </div>
        `);
        if (rawStr) {
            return li.outerHTML
        }
        document.querySelector('#shadowFields ol').appendChild(li)
    }

    const inputButtons = [];
    const inputButtonFields = {};

    function PushButtonFn(type, className, button, clickFn, field = '', contextMenuFn = null) {
        if (!className) {
            return
        }
        const fields = type === 'input' ? inputButtonFields : buttonFields;
        const pushButtons = type === 'input' ? inputButtons : buttons;
        if (field) {
            fields[field] ? fields[field].push(button) : fields[field] = [button];
        } else {
            button && pushButtons.push(button);
        }

        if (clickFn) {
            clickFns[className] = clickFn;
        }
        if (contextMenuFn) {
            contextMenuFns[className] = contextMenuFn;
        }
    }

    function PushExpandAnkiInputButton(className, button, clickFn, field = '', contextMenuFn = null) {
        PushButtonFn('input', className, button, clickFn, field, contextMenuFn)
    }

    function PushExpandAnkiRichButton(className, button, clickFn, field = '', contextMenuFn = null) {
        PushButtonFn('rich', className, button, clickFn, field, contextMenuFn)
    }

    const buttonFields = {};
    const buttons = [];

    function buildTextarea(rawStr = false, field = '', value = '', checked = false) {
        const li = document.createElement('div');
        const checkeds = checked ? 'checked' : '';
        const richText = spell();
        li.className = 'form-item'
        li.innerHTML = createHtml(`
            <input name="shadow-form-field[]" placeholder="字段名" value="${field}" class="swal2-input field-name">
            <div class="wait-replace"></div>            
            <div class="field-operate">
                <button class="minus">➖</button>
                <input type="radio" title="选中赋值" ${checkeds} name="shadow-form-defaut[]">
                <button class="paste-html" title="粘贴">✍️</button>
                <button class="text-clean" title="清空">🧹</button>
                <button class="action-copy" title="复制innerHTML 左键处理图片 右键不处理">⭕</button>
                <button class="action-switch-text" title="切换为textrea">🖺</button>
                <button class="word-wrap-first" title="在首行换行">🔼</button>
                <button class="word-wrap-last" title="在最后换行">🔽</button>
                ${buttons.join('\m')} ${buttonFields[field] ? buttonFields[field].join('\n') : ''}
            </div>
        `);
        const editor = richText.querySelector('.spell-content');

        if (rawStr) {
            richTexts.push((ele) => {
                editor.innerHTML = value;
                enableImageResizeInDiv(editor);

                ele.parentElement.replaceChild(richText, ele);
            })
            return li.outerHTML
        }
        li.removeChild(li.querySelector('.wait-replace'));
        enableImageResizeInDiv(editor);
        editor.innerHTML = value;
        li.insertBefore(richText, li.querySelector('.field-operate'));
        document.querySelector('#shadowFields ol').appendChild(li);
    }

    const base64Reg = /(data:(.*?)\/(.*?);base64,(.*?)?)[^0-9a-zA-Z=\/+]/i;

    async function fetchImg(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        for (const img of div.querySelectorAll('img')) {
            if (img.dataset.hasOwnProperty('fileName') && img.dataset.fileName) {
                img.src = img.dataset.fileName;
                continue;
            }
            const prefix = GM_getValue('proxyPrefix', '')
            if (img.src.indexOf('http') === 0) {
                const name = img.src.split('/').pop().split('&')[0];
                const {error: err} = await anki('storeMediaFile', {
                    filename: name,
                    url: prefix ? (prefix + encodeURIComponent(img.src)) : img.src,
                    deleteExisting: false,
                })
                if (err) {
                    throw err
                }
                img.src = name
            }
        }
        return div.innerHTML
    }

    async function checkAndStoreMedia(text) {
        text = await fetchImg(text);
        while (true) {
            const r = base64Reg.exec(text);
            if (!r) {
                break
            }
            const sha = sha1(base64ToUint8Array(r[4]));
            const file = 'paste-' + sha + '.' + r[3];
            const {error: err} = await anki("storeMediaFile", {
                    filename: file,
                    data: r[4],
                    deleteExisting: false,
                }
            )
            if (err) {
                throw err;
            }
            text = text.replace(r[1], file);
        }
        return text
    }

    function anki(action, params = {}) {
        return new Promise(async (resolve, reject) => {
            await GM_xmlhttpRequest({
                method: 'POST',
                url: ankiHost,
                data: JSON.stringify({action, params, version: 6}),
                headers: {
                    "Content-Type": "application/json"
                },
                onload: (res) => {
                    resolve(JSON.parse(res.responseText));
                },
                onerror: reject,
            })
        })
    }

    const styles = [];
    const htmls = [];
    const closeFns = [];
    const didRenderFns = [];

    function PushHookAnkiClose(fn) {
        fn && closeFns.push(fn)
    }

    function PushHookAnkiDidRender(fn) {
        fn && didRenderFns.push(fn)
    }

    function PushHookAnkiStyle(style) {
        style && styles.push(style)
    }

    function PushHookAnkiHtml(htmlFn) {
        htmlFn && htmls.push(htmlFn)
    }

    async function addAnki(value = '', tapKeyboard = null) {
        let deckNames, models;
        existsNoteId = 0;
        if (typeof value === 'string') {
            value = value.trim();
        }
        try {
            const {result: deck} = await anki('deckNames');
            const {result: modelss} = await anki('modelNames');
            deckNames = deck;
            models = modelss;
        } catch (e) {
            console.log(e);
            deckNames = [];
            models = [];
            setTimeout(() => {
                Swal.showValidationMessage('无法获取anki的数据，请检查ankiconnect是否启动或者重新设置地址再点🔨');
            }, 1000);
        }
        const model = GM_getValue('model', '问答题');
        let modelFields = GM_getValue('modelFields-' + model, [[1, '正面', true], [2, '背面', false]]);
        const deckName = GM_getValue('deckName', '');
        let enableSentence = GM_getValue('enableSentence', true)
        const sentenceFiled = GM_getValue('sentenceField', '句子');
        let sentenceNum = GM_getValue('sentenceNum', 1);
        const lastValues = {ankiHost, model, deckName,}
        const deckNameOptions = buildOption(deckNames, deckName);
        const modelOptions = buildOption(models, model);
        let sentenceBackup = {};
        const sentenceHtml = `<div class="wait-replace"></div>            
            <div class="field-operate">
                <button class="paste-html" title="粘贴">✍️</button>
                <button class="text-clean" title="清空">🧹</button>
                <button class="action-copy" title="复制innerHTML">⭕</button>
                <button class="action-switch-text" title="切换为textrea">🖺</button>
                ${buttons.join('\m')}
            </div>`
        const fieldFn = ['', buildInput, buildTextarea];
        const changeFn = ev => {
            if (ev.target.id === 'auto-sentence') {
                document.querySelector('.sample-sentence').style.display = ev.target.checked ? 'grid' : 'none';
                enableSentence = ev.target.checked
                return;
            }
            if (ev.target.id === 'sentence_num') {
                const {sentence, offset, word} = sentenceBackup;
                const num = parseInt(ev.target.value);
                document.querySelector('.sample-sentence .spell-content').innerHTML = cutSentence(word, offset, sentence, num);
                sentenceNum = num
                return;
            }
            if (ev.target.id !== 'model' && ev.target.id !== 'ankiHost') {
                return
            }
            const filed = ev.target.id === 'model' ? ev.target.value : ev.target.parentElement.nextElementSibling.nextElementSibling.querySelector('#model').value;
            if (filed === '') {
                return;
            }
            const modelField = GM_getValue('modelFields-' + filed, [[1, '正面', false], [2, '背面', false]]);
            document.querySelector('#shadowFields ol').innerHTML = '';
            if (modelField.length > 0) {
                modelField.forEach(v => {
                    let t = value
                    if (value instanceof HTMLElement) {
                        t = v[0] === 2 ? value.innerHTML : htmlSpecial(value.innerText.trim());
                    }
                    fieldFn[v[0]](false, v[1], v[2] ? t : '', v[2]);
                })
            }
        }
        document.addEventListener('change', changeFn);
        const clickFn = async ev => {
            if (ev.target.id === 'shadowAddField') {
                const type = parseInt(document.getElementById('shadowField').value);
                fieldFn[type]()
                return
            }
            const className = ev.target.className;
            if (className === 'hammer') {
                ankiHost = ev.target.parentElement.previousElementSibling.value;
                GM_setValue('ankiHost', ankiHost);
                try {
                    const {result: deck} = await anki('deckNames');
                    const {result: modelss} = await anki('modelNames');
                    deckNames = deck;
                    models = modelss;
                    ev.target.parentElement.parentElement.nextElementSibling.querySelector('#deckName').innerHTML = buildOption(deckNames, deckName);
                    ev.target.parentElement.parentElement.nextElementSibling.nextElementSibling.querySelector('#model').innerHTML = buildOption(models, model);
                    Swal.resetValidationMessage();
                } catch (e) {
                    Swal.showValidationMessage('无法获取anki的数据，请检查ankiconnect是否启动或者重新设置地址再点🔨');
                    console.log(e);
                }
                return
            }
            clickFns.hasOwnProperty(className) && clickFns[className] && clickFns[className](ev, tapKeyboard);
        }
        document.addEventListener('click', clickFn);
        const contextMenuFn = (ev) => {
            contextMenuFns.hasOwnProperty(ev.target.className) && contextMenuFns[ev.target.className](ev);
        };
        document.addEventListener('contextmenu', contextMenuFn);
        let ol = '';
        if (modelFields.length > 0) {
            ol = modelFields.map(v => {
                let t = value
                if (value instanceof HTMLElement) {
                    t = v[0] === 2 ? value.innerHTML : htmlSpecial(value.innerText.trim());
                }
                return fieldFn[v[0]](true, v[1], v[2] ? t : '', v[2])
            }).join('\n')
        }
        const hookStyles = styles.length > 0 ? `<style>${styles.filter(v => v !== '').join('\n')}</style>` : '';

        const style = `<style>${frameCss} ${spellCss} ${diagStyle}</style> ${hookStyles}`;
        const ankiHtml = `${style} 
    <div class="form-item">
        <label for="ankiHost" class="form-label">ankiConnect监听地址</label>
        <input id="ankiHost" value="${ankiHost}" placeholder="ankiConnector监听地址" class="swal2-input">
        <div class="field-operate">
                <button class="hammer">🔨</button>
            </div>
    </div>
    <div class="form-item">
        <label for="deckName" class="form-label">牌组</label>
        <select id="deckName" class="swal2-select">${deckNameOptions}</select>
    </div>
    <div class="form-item">
        <label for="model" class="form-label">模板</label>
        <select id="model" class="swal2-select">${modelOptions}</select>
    </div>
    
    <div class="form-item">
        <label for="tags" class="form-label">标签</label>
        <input id="tags" placeholder="多个用,分隔" class="swal2-input">
    </div>
    
    <div class="form-item">
        <label for="auto-sentence" class="form-label">自动提取句子</label>
        <input type="checkbox" ${enableSentence ? 'checked' : ''} class="swal2-checkbox" name="auto-sentence" id="auto-sentence">
    </div>
    
    <div class="form-item">
        <label for="shadowField" class="form-label">字段格式</label>
        <select id="shadowField" class="swal2-select">
            <option value="1">文本</option>
            <option value="2">富文本</option>
        </select>
        <button class="btn-add-field" id="shadowAddField">➕</button>
    </div>
    
    <div class="form-item" id="shadowFields">
        <ol>${ol}</ol>
    </div>
    <div class="form-item sample-sentence">
        <label class="form-label">句子</label>
        <div class="sentence_setting">   
            <label for="sentence_field" class="form-label">字段</label>
            <input type="text" value="${sentenceFiled}" id="sentence_field" placeholder="句子字段" class="swal2-input sentence_field" name="sentence_field" >       
            <label for="sentence_num">句子数量</label>
            <input type="number" min="0" id="sentence_num" value="${sentenceNum}" class="swal2-input sentence_field" placeholder="提取的句子数量">
            ${sentenceHtml}
        </div>
    </div>
    
    <div class="form-item" style="display: none">
        <label for="force-update" class="form-label">更新</label>
        <input type="checkbox" class="swal2-checkbox" name="update" id="force-update">
        <input type="button" class="card-delete" value="删除">
    </div>`;
        const ankiContainer = document.createElement('div');
        ankiContainer.className = 'anki-container';
        ankiContainer.innerHTML = ankiHtml;
        if (htmls.length > 0) {
            htmls.map(fn => fn(ankiContainer));
        }
        await Swal.fire({
            didRender: () => {
                const eles = document.querySelectorAll('.wait-replace');
                if (eles.length > 0) {
                    richTexts.forEach((fn, index) => fn(eles[index]))
                }
                const se = document.querySelector('.sentence_setting .wait-replace');
                if (se) {
                    const editor = spell();
                    editor.querySelector('.spell-content').innerHTML = getSentence(sentenceNum);
                    se.parentElement.replaceChild(editor, se);
                    enableImageResizeInDiv(editor.querySelector('.spell-content'))
                }
                if (!enableSentence) {
                    document.querySelector('.sample-sentence').style.display = 'none';
                }
                sentenceBackup = calSentence();
                didRenderFns.length > 0 && didRenderFns.forEach(fn => fn());
            },
            title: "anki制卡",
            showCancelButton: true,
            width: '55rem',
            html: ankiContainer,
            focusConfirm: false,
            didDestroy: () => {
                richTexts = [];
                document.removeEventListener('click', clickFn);
                document.removeEventListener('change', changeFn);
                document.removeEventListener('contextmenu', contextMenuFn);
                closeFns.length > 0 && closeFns.map(fn => fn());
            },
            preConfirm: async () => {
                let form = {};
                Object.keys(lastValues).forEach(field => {
                    form[field] = document.getElementById(field).value;
                })
                let fields = {};
                let modelField = [];
                for (const div of [...document.querySelectorAll('#shadowFields > ol > div')]) {
                    const name = div.children[0].value;
                    if (name === '') {
                        continue;
                    }
                    modelField.push([
                        div.children[1].tagName === 'INPUT' ? 1 : 2,
                        name,
                        div.children[2].children[1].checked
                    ]);
                    try {
                        if (div.children[1].tagName === 'INPUT') {
                            fields[name] = decodeHtmlSpecial(div.children[1].value);
                        } else {
                            const el = div.querySelector('.spell-content');
                            fields[name] = await checkAndStoreMedia(el.tagName === 'DIV' ? el.innerHTML : el.value)
                        }

                    } catch (e) {
                        Swal.showValidationMessage(e);
                        return
                    }
                }

                if (Object.values(form).map(v => v === '' ? 0 : 1).reduce((p, c) => p + c, 0) < Object.keys(form).length) {
                    Swal.showValidationMessage('还有参数为空!请检查！');
                    return
                }
                const tag = document.querySelector('#tags').value.trim();
                let tags = [];
                if (tag) {
                    tags = tag.replaceAll('，', ',').split(',');
                }

                if (enableSentence) {
                    const el = document.querySelector('.sentence_setting .spell-content');
                    fields[document.querySelector('#sentence_field').value] = await checkAndStoreMedia(el.tagName === 'DIV' ? el.innerHTML : el.value);
                }
                let params = {
                    "note": {
                        "deckName": form.deckName,
                        "modelName": form.model,
                        "fields": fields,
                        "tags": tags,
                    }
                }
                let res;
                try {
                    if (existsNoteId > 0 && document.querySelector('#force-update').checked) {
                        params.note.id = existsNoteId;
                        hookFns.forEach(fn => {
                            const note = fn(true, params.note);
                            params.note = note ? note : params.note;
                        });
                        res = await anki('updateNote', params)
                    } else {
                        res = await anki('addNote', params);
                        hookFns.forEach(fn => {
                            const note = fn(false, params.note);
                            params.note = note ? note : params.note;
                        });
                    }
                } catch (e) {
                    Swal.showValidationMessage('发生出错：' + e);
                    return
                }

                console.log(form, params, res);
                if (res.error !== null) {
                    Swal.showValidationMessage('发生出错：' + res.error);
                    return
                }
                Object.keys(lastValues).forEach(k => {
                    if (lastValues[k] !== form[k]) {
                        GM_setValue(k, form[k])
                    }
                });

                [
                    [enableSentence, 'enableSentence'],
                    //[sentenceNum, 'sentenceNum'],
                    [document.querySelector('#sentence_field').value, 'sentenceField']
                ].forEach(v => {
                    if (v[0] !== GM_getValue(v[1])) {
                        GM_setValue(v[1], v[0])
                    }
                })
                if (modelField.length !== modelFields.length || !modelField.every((v, i) => v === modelFields[i])) {
                    GM_setValue('modelFields-' + form.model, modelField)
                }
                Swal.fire({
                    html: "操作成功",
                    timer: 500,
                });
            }
        });
    }

    return {
        addAnki,
        anki, queryAnki,
        PushAnkiBeforeSaveHook, PushExpandAnkiRichButton, PushExpandAnkiInputButton,
        PushHookAnkiStyle, PushHookAnkiHtml, PushHookAnkiClose, PushHookAnkiDidRender
    };

})();

