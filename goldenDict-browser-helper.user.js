// ==UserScript==
// @name         goldenDict-browser-helper
// @namespace    https://github.com/fthvgb1
// @homepage     https://github.com/fthvgb1/goldendict-browser-helper
// @version      1.06
// @description  调用goldendict
// @author       https://github.com/fthvgb1
// @match        http://*/*
// @include      https://*/*
// @include      file:///*
// @connect      127.0.0.1
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @grant        GM_getResourceURL
// @require      https://raw.githubusercontent.com/nitotm/efficient-language-detector-js/main/minified/eld.M60.min.js
// @require      https://cdn.jsdelivr.net/npm/sweetalert2@11
// @require      https://cdnjs.cloudflare.com/ajax/libs/js-sha1/0.6.0/sha1.min.js
// @require      https://github.com/fthvgb1/goldendict-browser-helper/raw/refs/heads/master/resizeimg.js
// @require      https://github.com/fthvgb1/goldendict-browser-helper/raw/refs/heads/master/spell.js
// @require      https://github.com/fthvgb1/goldendict-browser-helper/raw/refs/heads/master/text.js
// @require      https://github.com/fthvgb1/goldendict-browser-helper/raw/refs/heads/master/lemmatizer.js
// @require      https://github.com/fthvgb1/goldendict-browser-helper/raw/refs/heads/master/anki.js
// @require      https://github.com/fthvgb1/goldendict-browser-helper/raw/refs/heads/master/frame.js
// @resource spell-css https://github.com/ninja33/ODH/raw/refs/heads/master/src/fg/css/spell.css
// @resource frame-css https://github.com/ninja33/ODH/raw/refs/heads/master/src/fg/css/frame.css
// @resource icon-anki https://github.com/fthvgb1/goldendict-browser-helper/blob/master/icon/anki.png?raw=true
// @resource icon-copy https://github.com/fthvgb1/goldendict-browser-helper/blob/master/icon/copy.png?raw=true
// @resource icon-goldenDict https://github.com/fthvgb1/goldendict-browser-helper/blob/master/icon/goldenDict.png?raw=true
// @resource icon-speak https://github.com/fthvgb1/goldendict-browser-helper/blob/master/icon/speak.png?raw=true
// @resource style https://github.com/fthvgb1/goldendict-browser-helper/raw/refs/heads/master/css/style.css?raw=true
// @resource diag-style https://github.com/fthvgb1/goldendict-browser-helper/raw/refs/heads/master/css/diag.css?raw=true
// @resource spell-icons-ttf https://github.com/ninja33/ODH/raw/refs/heads/master/src/fg/font/spell-icons.ttf
// @resource spell-icons-woff https://github.com/ninja33/ODH/raw/refs/heads/master/src/fg/font/spell-icons.woff
// @resource index.noun.json https://github.com/takafumir/javascript-lemmatizer/raw/refs/heads/master/dict/index.noun.json
// @resource noun.exc.json https://github.com/takafumir/javascript-lemmatizer/raw/refs/heads/master/dict/noun.exc.json
// @resource index.verb.json https://github.com/takafumir/javascript-lemmatizer/raw/refs/heads/master/dict/index.verb.json
// @resource verb.exc.json https://github.com/takafumir/javascript-lemmatizer/raw/refs/heads/master/dict/verb.exc.json
// @resource index.adj.json https://github.com/takafumir/javascript-lemmatizer/raw/refs/heads/master/dict/index.adj.json
// @resource adj.exc.json https://github.com/takafumir/javascript-lemmatizer/raw/refs/heads/master/dict/adj.exc.json
// @resource index.adv.json https://github.com/takafumir/javascript-lemmatizer/raw/refs/heads/master/dict/index.adv.json
// @resource adv.exc.json https://github.com/takafumir/javascript-lemmatizer/raw/refs/heads/master/dict/adv.exc.json
// ==/UserScript==

(function () {
    'use strict';
    const userAgent = navigator.userAgent.toLowerCase();
    const host = GM_getValue('host', 'http://127.0.0.1:9999');
    const goldDictKey = parseKey(GM_getValue('goldDictKey', 'ctrl c,ctrl c'));
    const ocrKey = parseKey(GM_getValue('ocrKey', ['windows', 'win32', 'win64'].filter(v => userAgent.indexOf(v) > -1).length > 0 ? 'cmd alt c' : 'alt c'));

    const menus = GM_getValue('menus', [
        {
            title: 'ocr translate',
            action: {next: goldDictKey, prev: ocrKey},
            key: 'h',
            path: 'aca'
        },
        {
            title: "ocr",
            action: ocrKey,
            key: "k"
        },
        {
            title: "parse qrcode",
            action: 'ctrl alt x',
            key: "x"
        },
        {
            title: "anki",
            action: () => {
                addAnki('', tapKeyboard)
            },
            key: "a"
        },
        /*{
            title: "sh",
            action: {
                cmd: "ls -l /var/log/!*.log",
            },
            key: "e",
            path: "cmd",
            call: (res) => {
                console.log(res.response)
            },
        }*/
        /*{
            title: "env",
            action: {
                cmd: ["env","grep","wc"],
                args: [],
                "1": ["PATH"],
                "2": ["-l"],
                env: ["PATH=$PATH:/home/xing"]
            },
            key: "e",
            path: "cmd",
            call: (res) => {
                console.log(res.response)
            },
        }*/
        /*{
            title: "ls",
            action: {cmd: "ls", args: ["-l", "/"]},
            key: "e",
            path: "cmd",
            call: (res) => {
                console.log(res.response)
            },
        }*/
    ]);
    menus.forEach(menu => {
        let fn = menu.action;
        if (typeof menu.action === 'string') {
            fn = () => {
                request('keys=' + parseKey(menu.action), menu.path, menu.hasOwnProperty('call') ? menu.call : null)
            }
        } else if (typeof menu.action === 'object') {
            fn = () => {
                request(menu.action, menu.path, menu.hasOwnProperty('call') ? menu.call : null)
            }
        }
        GM_registerMenuCommand(menu.title, () => {
            if (self === top) {
                fn();
            }
        }, menu.key);
    })

    let speakText = '', selectText = '', vices = [], engVice, utterance, vice;
    const initialFns = [];

    const iconArray = [
        {
            name: 'golden dict 左键查所选中的词，右键查所选词的原形',
            id: 'icon-golden-dict',
            image: GM_getResourceURL('icon-goldenDict'),
            trigger: (t) => {
                selectText = t;
                checkDict(t);
            },
            call: (img) => {
                img.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    const word = getSelection().toString().trim().toLowerCase();
                    const words = word.split(' ');
                    const last = words.length > 1 ? (' ' + words.slice(1).join(' ')) : '';
                    const first = words[0];
                    const res = lemmatizer.only_lemmas_withPos(first);

                    if (res.length < 1) {
                        img.click();
                        return
                    }

                    if (res.length === 1) {
                        if (res[0][1] === '') {
                            img.click();
                            return;
                        }
                        checkDict(res[0][0] + last);
                        return;
                    }

                    let wait = res[0][0];
                    [...res].splice(1).map(v => wait = v[0] === res[0][0] ? wait : v[0]);
                    if (wait === res[0][0]) {
                        checkDict(res[0][0] + last);
                        return;
                    }
                    const ops = [['', `有${res.length}个原形`], ...res.map(v => [v[0] + last, `${v[1]}: ${v[0] + last}`,])];
                    const options = buildOption(ops, '', 0, 1);
                    const sel = document.createElement('select');
                    sel.innerHTML = options;
                    const content = img.parentElement.querySelector('tr-content');
                    content.style.display = 'block';
                    content.querySelector('div').innerHTML = sel.outerHTML;
                    content.querySelector('select').addEventListener('change', function () {
                        this.value && checkDict(this.value);
                    })
                })
            }
        },
        {
            name: 'tts发音',
            id: 'icon-speech',
            image: GM_getResourceURL('icon-speak'),
            trigger: function (text, _, ev) {
                speakText = text;
                if (vices.length < 1) {
                    setTimeout(() => {
                        vices = speechSynthesis.getVoices();
                        if (vices.length > 0) {
                            speak(speakText, ev.target)
                        }
                    }, 450);
                } else {
                    speak(speakText, ev.target)
                }
            },
            hide: (icon) => {
                speechSynthesis.cancel();
            }
        },
        {
            name: 'force copy',
            id: 'icon-copy',
            image: GM_getResourceURL('icon-copy'),
            trigger: (t, hideIcon) => {
                const el = getSelectionElement();
                const html = el.innerHTML ? el.innerHTML : t;
                const item = new ClipboardItem({
                    'text/html': new Blob([html], {type: 'text/html'}),
                    'text/plain': new Blob([t], {type: 'text/plain'}),
                })
                navigator.clipboard.write([item]).catch((err) => {
                    console.log(err);
                    request('text=' + t, '', () => {
                        hideIcon();
                    }).catch(console.log);
                });
            },
        },
        {
            name: 'anki',
            icon: 'icon-anki',
            image: GM_getResourceURL('icon-anki'),
            trigger: (t) => {
                addAnki(getSelectionElement(), tapKeyboard).catch(res => console.log(res))
            }
        }
    ];

    speechSynthesis.addEventListener("voiceschanged", () => {
        if (vices.length < 1) {
            vices = speechSynthesis.getVoices();
            utterance = new SpeechSynthesisUtterance();
        }
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            start(iconArray, initialFns);
        });
    } else {
        start(iconArray, initialFns);
    }

    function checkDict(text, clearRange = false) {
        //eg: E:\\Program Files\\GoldenDict\\goldendict.exe|-s
        //eg: ["E:\\Program Files\\GoldenDict\\goldendict.exe",["-s"]]
        let cmd = GM_getValue('dictCmd');
        if (!cmd) {
            if (GM_getValue('goldDictKey', 'ctrl c,ctrl c') === 'ctrl c,ctrl c') {
                getSelection().removeAllRanges();
            }
            navigator.clipboard.writeText(text).then(r => {
                goldenDict('');
            }).catch((res) => {
                console.log(res);
                goldenDict(text);
            })
            return;
        }

        if (typeof cmd === 'string') {
            const cmds = cmd.split('|');
            let args = [];
            if (cmds.length > 1) {
                cmd = cmds[0];
                args = cmds.splice(1);
                args.push(text);
            }
            request({
                cmd: cmd,
                args: args
            }, 'cmd').catch(console.log)
            return;
        }

        if (Array.isArray(cmd)) {
            const args = [...cmd[1]];
            args.push(text);
            request({
                cmd: cmd[0],
                args: args,
            }, 'cmd').catch(console.log)
        }
    }

    function getSelectionElement() {
        const selectionObj = window.getSelection();
        const rangeObj = selectionObj.getRangeAt(0);
        const docFragment = rangeObj.cloneContents();
        const div = document.createElement("div");
        div.appendChild(docFragment);
        return div
    }


    async function tapKeyboard(keys) {
        await request('keys=' + parseKey(keys))
    }

    async function readClipboard(type = 0) {
        const {responseText: text} = await requestEx(host + '/clipboard?type=' + (type === 1 ? 'img' : 'text'));
        return text
    }

    async function requestEx(url, data = '', options = {}) {
        data = buildData(data)
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                url: url,
                data: data,
                method: 'GET',
                onload: function (res) {
                    return resolve(res)
                },
                onerror: function (res) {
                    reject(res)
                },
                ...options
            });
        })

    }

    function buildData(data) {
        if (typeof data === 'object') {
            data = Object.keys(data).map(k => {
                if (data[k] instanceof Array) {
                    return data[k].map(v => k + '=' + encodeURIComponent(v)).join('&')
                }
                return k + '=' + encodeURIComponent(data[k])
            }).join('&');
        }
        return data
    }

    async function request(data, path = '', call = null) {
        data = data ? buildData(data, path) : '';
        if (path !== '' && path[0] !== '/') {
            path = '/' + path;
        }
        await GM_xmlhttpRequest({
            method: "POST",
            url: host + path,
            data: data,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            onload: function (res) {
                if (call) {
                    call(res);
                }
            },
            onerror: function (res) {
                console.log(res);
            },
            onabort: function (res) {
                console.log(res);
            }
        });
    }

    function parseKey(key) {
        key = key.trim()
        if (key.indexOf('[') > -1) {
            return key
        }
        const keys = key.split(',').map(v => {
            v = v.trim()
            const vv = v.split(' ')
            if (vv.length > 1) {
                const k = vv[vv.length - 1]
                let kk = vv.slice(0, vv.length - 1)
                kk.unshift(k)
                return kk
            }
            return vv
        })
        return JSON.stringify(keys)
    }

    function goldenDict(text) {
        request({keys: goldDictKey, text: text})
    }

    function speak(t, icon) {
        const la = eld.detect(speakText).language;
        console.log(la);
        let vic = false;
        vices.forEach(value => {
            if (vic) {
                return
            }
            const lang = value.lang.toLowerCase()
            if (lang.indexOf(la) > -1) {
                vice = value
                vic = true
            }
            if (!engVice && lang.indexOf('en') > -1) {
                engVice = value
            }
        });
        if (!vice) {
            icon.title = '似乎无可用的tts,请先安装';
            return
        }
        utterance.voice = vice;
        utterance.text = t;
        speechSynthesis.speak(utterance);
    }

})();