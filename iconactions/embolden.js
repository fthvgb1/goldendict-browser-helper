;(() => {
    superFetchHook.hookLang({
        'embolden': `加粗`,
        'bold': `加粗的字段，如有多个值，可以指定分隔符如 正面@@\`,\`%%<b>{$bold}</b> %%后为格式`,
    });

    superFetchHook.htmlType['embolden'] = superFetchHook.lang('embolden');

    superFetchHook.fetchActionHelper.replaceFn.embolden = (item, target, clone = false, param = {}) => {
        if (!item['searchValue'] || superFetchHook.fetchActionHelper.textNode.has(target.nodeName)) {
            return
        }
        const words = parseWords(item, param).replace(/&nbsp;/g, ' ');
        if (!words) {
            return;
        }
        const format = item?.replaceValue ? item.replaceValue : '<b>{word}</b>';
        embolden(target, words, format);
    }

    const modeFn = {
        field(field) {
            return document.querySelector(`.field-name[value=${field}]+input`)?.value;
        },
        selector(field, selector) {
            return document.querySelector(`.field-name[value=${field}]+.spell .spell-content ${selector}`)?.innerText;
        },
        anchor(f, s, item, param) {
            const rule = {...param.rule, 'value-selector': item['searchValue']}
            const ele = superFetchHook.fetchActionHelper.anchor2Ele(rule, param.beforeQueryEle, param.fetchParam);
            if (!ele) {
                return '';
            }
            return superFetchHook.fetchActionHelper.textNode.has(ele.nodeName) ? ele.value : ele.innerText;
        },
        variable(f, s, item, param) {
            return param.vars[item.searchValue] ?? '';
        }
    };

    function parseWords(item, param) {
        const arr = item['searchValue'].split('@');
        const field = arr[0], selector = arr?.[1] ?? '';
        const mode = item['replace_regex_pattern'] ? item['replace_regex_pattern'] : 'field';
        if (!modeFn?.[mode]) {
            return '';
        }
        return modeFn[mode](field, selector, item, param);
    }


    function buildRegular(words, flag, find = false) {
        let suffix = '';
        const w = [];
        const ends = find ? '.+?' : '.*?';
        const begin = find ? '\\w+?' : '\\w*?';
        words.forEach(word => {
            if (!word) {
                return
            }
            word = escapeRegExp(word);
            if (word.length <= 2) { //  || (word.length === 3 && !find)
                w.push(word);
                return;
            }
            if (word[word.length - 1] === '-') {
                const prefix = word.slice(0, -1);
                w.push(word + '.+?');
                if (!words.includes(prefix)) {
                    w.push(prefix + ends);
                }
                return
            }
            if (word === suffix) {
                suffix = '';
                w.push(word + ends);
                w.push(begin + word);
                return
            }
            if (word[0] === '-') {
                suffix = word.slice(1);
                if (!words.includes(suffix)) {
                    w.push(begin + suffix);
                }
                w.push(begin + word);
                return
            }
            w.push(word + ends);
        });
        return new RegExp(`\\b(${w.join('|')})\\b`, flag);
    }

    function eleBold(el, words, formats, boldAll) {
        if (el.childNodes.length < 1) {
            return 0;
        }
        const flag = 'ig';
        const wordReg = buildRegular(words, flag);
        const d = document.createElement('div');
        let replacedNum = 0;
        // wtf! loop nodes with for ...of none other than dynamic
        for (const node of [...el.childNodes]) {
            if (node.nodeType === node.TEXT_NODE) {
                const o = node.nodeValue;
                let n = node.nodeValue.replace(wordReg, formats);
                if (o !== n) {
                    d.innerHTML = n;
                    node.replaceWith(...d.childNodes)
                    replacedNum++;
                    if (!boldAll) {
                        break;
                    }
                    continue;
                }
                let wordsEx = [...words];
                while (true) {
                    wordsEx = wordsEx.filterAndMapX(v => v.length > 3 ? v.slice(0, -1) : false);
                    if (wordsEx.length < 1) {
                        break
                    }
                    const wordReg = buildRegular(wordsEx, flag, true);
                    n = node.nodeValue.replace(wordReg, formats);
                    if (o !== n) {
                        d.innerHTML = n;
                        node.replaceWith(...d.childNodes)
                        replacedNum++;
                        if (!boldAll) {
                            return replacedNum;
                        }
                        break;
                    }
                }
            }
            if (node.nodeType === node.ELEMENT_NODE) {
                replacedNum += eleBold(node, words, formats);
            }
        }
        return replacedNum;
    }

    function embolden(sentenceEle, words, formats = '<b>{word}</b>', separator = ' ', boldAll = true) {
        if (!sentenceEle || !words) {
            return sentenceEle;
        }
        if (typeof sentenceEle === 'string') {
            sentenceEle = document.createElement('div');
        }
        words = words.split(separator);
        [...words].forEach(word => {
            const irs = lemmatizer.irregularConjugationOrPluralities(word);
            if (irs.length < 1) {
                return
            }
            irs.forEach(v => v[0].forEach(vv => words.push(vv)));
        })
        words = words.sort((a, b) => a.length <= b.length ? 1 : -1);
        formats = formats.split('{word}').join('\$&');
        eleBold(sentenceEle, words, formats, boldAll)
        return sentenceEle.innerHTML;
    }

})();