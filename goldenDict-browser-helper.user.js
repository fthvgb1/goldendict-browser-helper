// ==UserScript==
// @name         goldenDict-browser-helper
// @namespace    http://tampermonkey.net/
// @version      0.99
// @description  调用goldendict
// @author       https://github.com/fthvgb1/goldendict-browser-helper
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
// @require      https://github.com/ninja33/ODH/raw/refs/heads/master/src/fg/js/spell.js
// @require      https://github.com/ninja33/ODH/raw/refs/heads/master/src/fg/js/text.js
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
    String.prototype.replaceWithMap = function (m) {
        let s = this;
        Object.keys(k => {
            s = s.replaceAll(k, m[k]);
        })
        return s
    }
    const userAgent = navigator.userAgent.toLowerCase();
    const host = GM_getValue('host', 'http://127.0.0.1:9999');
    const goldDictKey = parseKey(GM_getValue('goldDictKey', 'ctrl c,ctrl c'));
    const ocrKey = parseKey(GM_getValue('ocrKey', ['windows', 'win32', 'win64'].filter(v => userAgent.indexOf(v) > -1).length > 0 ? 'cmd alt c' : 'alt c'));
    let shadowRoot;
    const eles = [];
    const styles = [];

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
    let gbinded = false;
    let icon;

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
                }).finally(() => {
                    if (!gbinded) {
                        const ss = icon.querySelector('img[icon-id="icon-golden-dict"]');
                        setTimeout(() => {
                            ss.addEventListener('click', goldenDictEv, false)
                            gbinded = true
                        }, 100)
                    }
                })
            },
            hide: () => {
                const ele = icon.querySelector('img[icon-id="icon-golden-dict"]');
                if (ele) {
                    ele.removeEventListener('click', goldenDictEv, false)
                    gbinded = false
                }
            }
        },
        {
            name: 'tts发音',
            id: 'icon-speech',
            image: GM_getResourceURL('icon-speak'),
            trigger: function (text) {
                speakText = text;
                if (vices.length < 1) {
                    setTimeout(() => {
                        vices = speechSynthesis.getVoices();
                        if (vices.length > 0) {
                            speak(speakText)
                        }
                    }, 450);
                } else {
                    speak(speakText)
                }
            },
            hide: () => {
                const k = icon.querySelector('img[icon-id="icon-speech"]');
                speechSynthesis.cancel();
                if (k) {
                    k.removeEventListener('click', speech, false)
                }
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

    function speech(event) {
        var ss = icon.querySelector('img[icon-id="icon-speech"]');
        if (event.target === ss) {
            speechSynthesis.speak(utterance);
        }
    }

    function goldenDict(text) {
        request({keys: goldDictKey, text: text})
    }

    function goldenDictEv(e) {
        const ele = icon.querySelector('img[icon-id="icon-golden-dict"]')
        if (e.target !== ele) {
            return
        }
        goldenDict(selectText);
    }

    function speak(t) {
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
            if (!engVice) {
                icon.querySelector('img[icon-id="icon-speech"]').title = '似乎无可用的tts,请先安装';
                return
            } else {
                vice = engVice
            }
        }
        utterance.voice = vice;
        utterance.text = t;
        speechSynthesis.speak(utterance);
        setTimeout(() => {
            const ss = icon.querySelector('img[icon-id="icon-speech"]');
            ss.addEventListener('click', speech, false)
        }, 100)
    }

    const helperFn = () => {
        /**样式*/
        const style = document.createElement('style');
        // >>>>> 可以自定义的变量
        const fontSize = 14; // 字体大小
        const iconWidth = 300; // 整个面板宽度
        const iconHeight = 400; // 整个面板高度
        // 可以自定义的变量 <<<<< （自定义变量修改后把 “@version” 版本号改为 “10000” 防止更新后消失）
        const trContentWidth = iconWidth - 16; // 整个面板宽度 - 边距间隔 = 翻译正文宽度
        const trContentHeight = iconHeight - 35; // 整个面板高度 - 边距间隔 = 翻译正文高度
        const zIndex = '2147483647'; // 渲染图层
        style.textContent = GM_getResourceText('style').replaceWithMap({
            '${fontSize}': fontSize,
            '${zIndex}': zIndex,
            '${trContentWidth}': trContentWidth,
            '${trContentHeight}': trContentHeight,
        });
        // iframe 工具库
        const iframe = document.createElement('iframe');
        let iframeWin = null;
        let iframeDoc = null;
        iframe.style.display = 'none';
        icon = document.createElement('tr-icon'); //翻译图标
        let content = document.createElement('tr-content'), // 内容面板
            contentList = document.createElement('div'), //翻译内容结果集（HTML内容）列表
            selected, // 当前选中文本
            engineId, // 当前翻译引擎
            engineTriggerTime, // 引擎触发时间（milliseconds）
            idsType, // 当前翻译面板内容列表数组
            pageX, // 图标显示的 X 坐标
            pageY; // 图标显示的 Y 坐标
        // 初始化内容面板
        content.appendChild(contentList);
        // 发音缓存
        let audioCache = {}; // {'mp3 download url': data}
        // 翻译引擎结果集
        let engineResult = {}; // id: DOM
        // 唯一 ID


        // 绑定图标拖动事件
        const iconDrag = new Drag(icon);
        // 图标数组
        let hideCalls = []
        // 添加翻译引擎图标
        iconArray.forEach(function (obj) {
            // todo bypass icon maybe can't load within csp limited
            const img = document.createElement('img');
            img.setAttribute('src', obj.image);
            img.setAttribute('alt', obj.name);
            img.setAttribute('title', obj.name);
            img.setAttribute('icon-id', obj.id);
            img.addEventListener('mouseup', (event) => {
                if (engineId === obj.id) {
                    // 已经是当前翻译引擎，不做任何处理
                } else {
                    icon.setAttribute('activate', 'activate'); // 标注面板展开
                    engineId = obj.id; // 翻译引擎 ID
                    engineTriggerTime = new Date().getTime(); // 引擎触发时间
                    engineActivateShow(); // 显示翻译引擎指示器
                    audioCache = {}; // 清空发音缓存
                    engineResult = {}; // 清空翻译引擎结果集
                    obj.trigger(selected, hideIcon, engineTriggerTime); // 启动翻译引擎
                }
            });
            icon.appendChild(img);
            if (obj.hide) {
                hideCalls.push(obj.hide)
            }
        });
        // 添加内容面板（放图标后面）
        icon.appendChild(content);
        // 添加样式、翻译图标到 DOM
        const root = document.createElement('div');
        document.documentElement.appendChild(root);
        const shadow = root.attachShadow({
            mode: 'closed'
        });
        shadowRoot = shadow
        // iframe 工具库加入 Shadow
        shadow.appendChild(iframe);
        iframeWin = iframe.contentWindow;
        iframeDoc = iframe.contentDocument;


        if (styles.length > 0) {
            styles.forEach(v => {
                const st = document.createElement('style');
                st.textContent = v;
                shadow.appendChild(st);
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.type = 'text/css';
                link.href = createObjectURLWithTry(new Blob(['\ufeff', v], {
                    type: 'text/css;charset=UTF-8'
                }));
                shadow.appendChild(link);
            })
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = createObjectURLWithTry(new Blob(['\ufeff', style.textContent], {
            type: 'text/css;charset=UTF-8'
        }));
        // 多种方式最大化兼容：Content Security Policy
        // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy
        shadow.appendChild(style); // 内部样式表
        shadow.appendChild(link); // 外部样式表
        // 翻译图标加入 Shadow
        shadow.appendChild(icon);

        if (eles.length > 0) {
            eles.forEach(ele => {
                shadow.appendChild(ele)
            })
        }
        // 鼠标事件：防止选中的文本消失
        document.addEventListener('mousedown', function (e) {
            log('mousedown event:', e);
            if (e.target === icon || (e.target.parentNode && e.target.parentNode === icon)) { // 点击了翻译图标
                e.preventDefault();
            }
        });
        // 鼠标事件：防止选中的文本消失；显示、隐藏翻译图标
        document.addEventListener('mouseup', showIcon);
        // 选中变化事件
        document.addEventListener('selectionchange', showIcon);
        document.addEventListener('touchend', showIcon);
        // 内容面板滚动事件
        content.addEventListener('scroll', function (e) {
            if (content.scrollHeight - content.scrollTop === content.clientHeight) {
                log('scroll bottom', e);
                e.preventDefault();
                e.stopPropagation();
            } else if (content.scrollTop === 0) {
                log('scroll top', e);
                e.preventDefault();
                e.stopPropagation();
            }
        });

        /**日志输出*/
        function log() {
            const debug = false;
            if (!debug) {
                return;
            }
            if (arguments) {
                for (var i = 0; i < arguments.length; i++) {
                    console.log(arguments[i]);
                }
            }
        }

        /**鼠标拖动*/
        function Drag(element) {
            this.dragging = false;
            this.startDragTime = 0;
            this.stopDragTime = 0;
            this.mouseDownPositionX = 0;
            this.mouseDownPositionY = 0;
            this.elementOriginalLeft = parseInt(element.style.left);
            this.elementOriginalTop = parseInt(element.style.top);
            var ref = this;
            this.startDrag = function (e) {
                e.preventDefault();
                ref.dragging = true;
                ref.startDragTime = new Date().getTime();
                ref.mouseDownPositionX = e.clientX;
                ref.mouseDownPositionY = e.clientY;
                ref.elementOriginalLeft = parseInt(element.style.left);
                ref.elementOriginalTop = parseInt(element.style.top);
                // set mousemove event
                window.addEventListener('mousemove', ref.dragElement);
                log('startDrag');
            };
            this.unsetMouseMove = function () {
                // unset mousemove event
                window.removeEventListener('mousemove', ref.dragElement);
            };
            this.stopDrag = function (e) {
                e.preventDefault();
                ref.dragging = false;
                ref.stopDragTime = new Date().getTime();
                ref.unsetMouseMove();
                log('stopDrag');
            };
            this.dragElement = function (e) {
                log('dragging');
                if (!ref.dragging) {
                    return;
                }
                e.preventDefault();
                // move element
                element.style.left = ref.elementOriginalLeft + (e.clientX - ref.mouseDownPositionX) + 'px';
                element.style.top = ref.elementOriginalTop + (e.clientY - ref.mouseDownPositionY) + 'px';
                log('dragElement');
            };
            element.onmousedown = this.startDrag;
            element.onmouseup = this.stopDrag;
        }

        /**强制结束拖动*/
        function forceStopDrag() {
            if (iconDrag) {
                // 强制设置鼠标拖动事件结束，防止由于网页本身的其它鼠标事件冲突而导致没有侦测到：mouseup
                iconDrag.dragging = false;
                iconDrag.unsetMouseMove();
            }
        }

// html 字符串转 DOM
        /**带异常处理的 createObjectURL*/
        function createObjectURLWithTry(blob) {
            try {
                return iframeWin.URL.createObjectURL(blob);
            } catch (error) {
                log(error);
            }
            return '';
        }

        /**隐藏翻译引擎指示器*/
        function engineActivateHide() {
            icon.querySelectorAll('img[activate]').forEach(function (ele) {
                ele.removeAttribute('activate');
            });
        }

        /**显示翻译引擎指示器*/
        function engineActivateShow() {
            engineActivateHide();
            icon.querySelector('img[icon-id="' + engineId + '"]').setAttribute('activate', 'activate');
        }

        /**显示 icon*/
        function showIcon(e) {
            log('showIcon event:', e);
            let offsetX = 4; // 横坐标翻译图标偏移
            let offsetY = 8; // 纵坐标翻译图标偏移
            // 更新翻译图标 X、Y 坐标
            if (e.pageX && e.pageY) { // 鼠标
                log('mouse pageX/Y');
                pageX = e.pageX;
                pageY = e.pageY;
            }
            if (e.changedTouches) { // 触屏
                if (e.changedTouches.length > 0) { // 多点触控选取第 1 个
                    log('touch pageX/Y');
                    pageX = e.changedTouches[0].pageX;
                    pageY = e.changedTouches[0].pageY;
                    // 触屏修改翻译图标偏移（Android、iOS 选中后的动作菜单一般在当前文字顶部，翻译图标则放到底部）
                    offsetX = -26; // 单个翻译图标块宽度
                    offsetY = 16 * 3; // 一般字体高度的 3 倍，距离系统自带动作菜单、选择光标太近会导致无法点按
                }
            }
            log('selected:' + selected + ', pageX:' + pageX + ', pageY:' + pageY)
            if (e.target === icon || (e.target.parentNode && e.target.parentNode === icon)) { // 点击了翻译图标
                e.preventDefault();
                return;
            }
            selected = window.getSelection().toString().trim(); // 当前选中文本
            log('selected:' + selected + ', icon display:' + icon.style.display);
            if (selected && icon.style.display !== 'block' && pageX && pageY) { // 显示翻译图标
                log('show icon');
                icon.style.top = pageY + offsetY + 'px';
                icon.style.left = pageX + offsetX + 'px';
                icon.style.display = 'block';
                // 兼容部分 Content Security Policy
                icon.style.position = 'absolute';
                icon.style.zIndex = zIndex;
            } else if (!selected) { // 隐藏翻译图标
                log('hide icon');
                hideIcon();
            }
        }

        /**隐藏 icon*/
        function hideIcon() {
            icon.style.display = 'none';
            icon.removeAttribute('activate'); // 标注面板关闭
            content.style.display = 'none';
            engineId = '';
            engineTriggerTime = 0;
            pageX = 0;
            pageY = 0;
            engineActivateHide();
            audioCache = {};
            engineResult = {};
            forceStopDrag();
            const s = icon.querySelector('.langs-cj');
            if (s) {
                s.parentNode.removeChild(s);
            }
            if (hideCalls.length > 0) {
                hideCalls.forEach(fn => {
                    fn()
                })
            }
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", helperFn);
    } else {
        helperFn()
    }

})();