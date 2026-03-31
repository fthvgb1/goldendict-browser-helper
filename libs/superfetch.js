;const fetchText = (function () {
    const rules = deepAssign({
        items: {
            content: {
                selector: '.topic_content:not(:has(.markdown_body)),.markdown_body,.reply_content',
                replaces: {
                    '&nbsp;': ' ',
                    '@(.+?) ': '对$1说：',
                    '^(?!对.*?说)(.*)': '说道：$1'
                },
                attribute: 'textContent', // default innerText
                removes: 'a:not([href^="/member"])',
                items: {
                    attachments: {
                        selector: '.subtle',
                        multiple: true,
                        replaces: {
                            '(\n?.*)[=]': '又在$1中说到'
                        },
                        removes: '.fade span[title]'
                    }
                },
                //format: '{content} {attachments}'
            },
            no: {
                selector: '.no',
                replaces: {
                    "(\\d+)": '$1楼的'
                },
                defaultValue: '楼主',
            },
            author: '.gray > a,.dark',
            //date: '.ago',
        },
        format: '{no} {author} {content} {content.attachments}',
    });

    function replaceVars(vars, str) {
        return Object.keys(vars).reduce((str, key) => str.replaceAll(`{${key}}`, vars[key]), str);
    }

    function deepAssign(target, ...sources) {
        for (const source of sources) {
            for (let k in source) {
                let vs = source[k], vt = target[k]
                if (Object(vs) === vs && Object(vt) === vt) {
                    target[k] = deepAssign(vt, vs)
                    continue
                }
                target[k] = source[k]
            }
        }
        return target
    }

    function extractValue(varEle, item) {
        if (!varEle) {
            return item?.defaultValue ?? '';
        }
        if (item?.removes) {
            varEle = varEle.cloneNode(true);
            varEle.querySelectorAll(item.removes)?.forEach(el => el.remove());
        }

        let value = varEle?.[item?.attribute] ?? varEle.innerText;
        if (item?.replaces) {
            value = Object.keys(item.replaces).reduce((val, key) => {
                try {
                    const reg = key.split('[=]');
                    val = val.replace(new RegExp(reg[0], reg?.[1] ?? 'g'), item.replaces[key])
                } catch (e) {
                    val = val.replaceAll(key, item.replaces[key]);
                }
                return val;
            }, value)
        }
        return value ? value : item?.defaultValue;
    }

    function getVars(div, rule) {
        const vars = {}, fields = Object.keys(rule.items);
        const values = fields.map(k => {
            const item = rule.items[k];
            if (!item) {
                return '';
            }
            if (typeof item === 'string') {
                return div.querySelector(item)?.innerText ?? '';
            }
            if (typeof item !== 'object') {
                return '';
            }
            let vals = item?.defaultValue ?? '';
            if (item?.selector) {
                if (!item?.multiple) {
                    vals = extractValue(div.querySelector(item.selector), item);
                } else {
                    vals = [...div.querySelectorAll(item.selector)].map(el => extractValue(el, item)).join('\n');
                }
            }

            if (item?.items) {
                const v = getVars(div, {items: item.items});
                if (item?.format) {
                    vals = replaceVars(v, item.format)
                } else {
                    Object.keys(v).forEach(key => vars[`${k}.${key}`] = v[key]);
                }
            }
            return vals
        });
        fields.forEach((key, i) => vars[key] = values[i]);
        return vars;
    }

    function getText(div, rule) {
        const vars = getVars(div, rule);
        const fields = Object.keys(vars);
        return replaceVars(vars, rule?.format ?? `{${fields.join('} {')}`);
    }

    return getText
})();