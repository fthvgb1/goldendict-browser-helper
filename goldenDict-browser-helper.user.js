// ==UserScript==
// @name         goldenDict-browser-helper
// @namespace    https://github.com/fthvgb1
// @homepage     https://github.com/fthvgb1/goldendict-browser-helper
// @version      1.03
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

    let speakText = '';
    let selectText = '';
    const iconArray = [
        {
            name: 'golden dict',
            id: 'icon-golden-dict',
            image: GM_getResourceURL('icon-goldenDict'),
            trigger: (t) => {
                selectText = t
                navigator.clipboard.writeText(selectText).then(r => {
                    goldenDict('')
                }).catch((res) => {
                    console.log(res)
                    goldenDict(selectText)
                })
            },
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

    if (iconArray.length < 1) {
        return
    }
    let vices = [];
    let engVice;
    let utterance;
    speechSynthesis.addEventListener("voiceschanged", () => {
        if (vices.length < 1) {
            vices = speechSynthesis.getVoices();
            utterance = new SpeechSynthesisUtterance();
        }
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            start(iconArray);
        });
    } else {
        start(iconArray);
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

    let vice;

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