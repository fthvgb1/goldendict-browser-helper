// ==UserScript==
// @name         goldenDict-browser-helper
// @namespace    http://tampermonkey.net/
// @version      0.94
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
// @require      https://raw.githubusercontent.com/nitotm/efficient-language-detector-js/main/minified/eld.M60.min.js
// @require      https://cdn.jsdelivr.net/npm/sweetalert2@11
// ==/UserScript==

(function () {
    'use strict';
    const userAgent = navigator.userAgent.toLowerCase();
    const host = GM_getValue('host', 'http://127.0.0.1:9999');
    let ankiHost = GM_getValue('ankiHost', 'http://127.0.0.1:8765');
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
                addAnki()
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
        GM_registerMenuCommand(menu.title, fn, menu.key);
    })

    let speakText = '';
    let selectText = '';
    let gbinded = false;
    let icon;

    const iconArray = [
        {
            name: 'golden dict',
            id: 'icon-golden-dict',
            image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAABPlJREFUSEu1lQ9MlGUcxz/vHXAHHCUg4KGgxx8BRQv/lJSzrDUra1nTuTB16kQIbWlGizlzM6ebm06dZGXOOdlSNJdCaqEJk6GipiQM/yGoCdyd/Lnj7t4/d+/b7lRWgi3nfLZ377N339/38zy/3/t7HoGnPIQn9PfHhwM9j/J5IkD+68wdYGJsp4M9236nuj/IYwNiwJTzJtOyxmQumr5458Rw81h2FGbWLlhf/x7Q+jCkD2DjTDJQGCwEIT8Ql9agKV7CsoYzfOac2QsyJuU+NyhlYq/Xlk8sXZ9vbV4lqWx6JODbjzAbogfkvZRTvNQUbYlQJBeaqoKmasZgmbY77UJs4kjMKdl9MnHp3Akq9625c+zXisID5yn5pyCwg+IcItNeHlH5wvTFo0yx+fgAjwcUrxeP6MHR3c2pUzW8M3UqAyPD+gCutnQiOS5isK/l0K7jKz/b6V39QBQAbPyQ196aazmWkDUL/cDVSD09AWNJlvC4XNjtHVQc+405s2djsVj6AKx2D/UXDjIsciMHt5+//Ok2ZSZw0S8MADbnMGvSNHanvlJMUGQ+HrcTSfIgSSJulxub3c7hw4eZP38+ycnJ/f6RR46WkxBcSGVpg61gG/nA/l7AnpWJm7OyrUuGZFchhI1HcncjSRKyrNDT48RqtVJeXs7ChQtJSUnpF3C0ooZo30o6Lp+TCtZ0Fl2zsqEXUL4+dX/GqLsfxE9qQtM9gyQ6EUURxSvj6nHS3malrLyc3NzcRwKqT19Hay3C6D7Nl+tuban4Uy3yN6CwYQahI8bHnB+dPTw9buJJZElB8udfEhFlOVCDtra2wA7+C1DX0IazpZhw5y42bW35eWcVS4BbwuZ5xFiG0jz27QVhceO3I3q8KLILSRSRFQXXPwCLcnNJ7idFNpudphY7gvssuubllPzYfnLHCZY7PJwWvs8PnWBJ9NRkTvmKuKxVeDwyiiIGUiQrEq4ed+8O8vLySEpK6q1BXV0dtbW1tLe3k/n8BNKGmXDUvEv1GfHygWrX2qp6325h19KBeWlJ8jcj399L+OApgWCv14skyoFCO13OgEF5WRkfFxQQFxtLY2MjpaX7sNlsREdHMWr0aNIzMkkYmkrzT+O42tRl+6Xq9u4fKqSvhZJlkesyM2K/GPhGKUpEJpKjK1BcySMi+4vscmO327h04RyTX51IVfUZ6hvqMRpDSUhIJHFoImZzPFFRMQxOSkc8OYvWa2ddhyqbj2wqk1cIuwqE4xkp8ZOvK9k03LgLqgdNBVVTA0eFqqpIsohbNwSrKwyfrRZDSDDGUAPhocGEhhgICdGh00FUzBDGxd9G6WjkbKOzrmgPC4XieVyzdZHsNxWE+53n70DdvXmEAcwRIIVE0CqbMTqvYHWApEKw/t6j98cJ4FPvtW6UCUSNvwpLWCx8V2Ba0Salre7s6iYoyK/UPSiihgbhRkHzuTt1ekc7/nibG8LNqX6dD03T6XSCoN2P0FQNY3Awcc967/5Rf71qxwnvAWHvDPT7bzGvw81Y1Rfw6B0+Fc1kxDB+9LCp9u4gM3ojMSY3re32IxdvOK4Yg9AJ0LuiQOfq0d200XHDSrPi4+yD+8D/HgQEgX/d/xraGAvRL6ZHLDMY9PGXmpxXK+p8TRC4wVoAfT9nhx/aDTge50YzAGmACbgJ3O73UHro4+MA/o9fH81TB/wNCHBBieXFoj8AAAAASUVORK5CYII=',
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
            image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAbCAYAAACJISRoAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAANsSURBVEhLlVY7aBRRFD1vN5vVJKtoosFI4icYEEHE+IckiBFJITaWFlpYiIWdFmKhoihYamWhkM7KylYUC+OfWAiCHxJFo0ENyWqya3a8n/f2vdmdgXjZ3fPOnTfvnnNn3syag8NRBPrAGCQiCPGfWLNOhrKaCJEm6oh+ZUDcYh2X8PM1HUctIooDJEU6ol8ZJHCLGv64puNci1gdiSjDep7mRCHObRGvqA7pkzERcjSzMRs566lOFLwjDj1HZXkMlOWyQOdSgxM7gFN7DLpbgYZMuhNNx9EK8wrsQH4X5yL0rwXODwID64DdXcDpPqBjSboTTce5bZfqYIUtjUAhb9DWDBzdanB8O6RV994Czz4DbU3AqkK6E4U4lyKG6vHiBzZEOLcXuEjKL+8H9nUDU7PA9ccRhl8CEzNAls7I0jVKcrJ+eYSeNl7UO+KQIrmswZEtwLFeQ/0HVrYA7fTlRS89AEbGDcoVmW8j2cmFQYNrQ9QRWk8PK0oRvmv61gCleeDqQ+AGKecYnwLGfgKVao9dqJNCPkIrta8hU3PczbcoRTJUsSUP/CkDoxPA96JTSKGSZOhDnZzcZUg90Nxolbtw10TtahFWxpSrahsDXY4HKSY8j28Cbm+eOhE/7J1w2CIxHRQBV0lOlI0EbkcSgRPGqpN4BFwlOVE2ErgdSQROGKtOmHBVVRjocjxIMVmoEw4pwnfPTIl3OLC5HVjRHOhSSRZdqJPRr8Cjj3TD/E13wiFFSvNGJufpOXWmX+8aDr6oXctoEiurVU78zmu63UeAYindCaMUKc/Tjn4F3Hoeyd74RpuQNyJvyLMDwM5OfQr7UCez5KBIHXD7aOwX8O4H8Yp3wmhfvzyinU/fPLWMqy8iPLxJH4zztNvvv9ei21YDV2jDPvlU7YYEn9NEjyZ6/GFmTnPusNWntEwK+NpMz0WYLAK3X0S4+ZTzwFAP0EsFJn8DX6bViV9GdRZLEZ3Lxb0TjqoT7rHkWFLA+X3SUQAObSSXDcDdN8AHagl12K0hYU9LxAX9W+E3Y5ZfVHTa34qRa8D5+uUs1qxj28UTUpA+lcjQ4noXUkclrzP8vBinhWXEhShi10RQhvVcxAd5HVlOBxO5nuSdVJWohHpuUaOGO+WcD7nFqpOYkpDLgLhFjQQeYuAkAvAPy4GovdmaNF4AAAAASUVORK5CYII=',
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
            image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAABBRJREFUeF7tm0uoTlEUx3+XEFEG3mSghFLKABkpBsoj5FEeGQhlICVkQMpAxMCrFAbyyPtREkoykNeMkqKURB4D5U0e5/917nWcb5/77e/es/b9vnvPGn7fPmvt9d9rP9Z/7d1AB5eGDu4/PgD0AMYA/YEuxoC9BZ4Cr4ztNKlvDoCRUastwEyge6gOAX+AB8A24KK13SwAVgD7Aox4Jf/OAkuBL5UatvR/FwArgQMtVWjw3VVgOvDLQHfZGjACeFQDI5/2dQOwIwQAJ4EFFoZaqfMDMBT42Eo9ZZ8np4BW+/eOBe8NsAy4DvzMuwMpfaOAvcBkh535wJm87ScBmADccRiYBlzJ23Az+npGC9/zaBHuk2qzE1iXdz+SAMyK9vsLDgPdgB95G66g71K8/SabHQcW592PJAAKsVMOAz6Hpbz7dRqYl1Kq8Fcfc5UCgASctRQBRx3hfgxYkuvww3/ngFoCYBEgh5Oi+a91IFep1SkgJzcBq2Nv9wBbc/U8VlbLAFj4W6azAKBGF8Egoy8jRQQUEfAPAettcBgwI9rKhgP9jGNcR3clcXcB8QmZWWSIKTAEUCIjgNviWK1UWvTaLhepYg3AWOAyMNB4xH3UXwPmpOk1SwA08iI3B/j0LlCbsoTKEoBaZZcUBU1pvxUAWvCeZcx5cY5PjEe8a8RgTQT6OuzcB8Y3/m4FgM7wux3G12T8boGHmCWN9JSUctUdBgOvLQ9C+4FVKcMP4wqThbNZOsUxPnb8OQm4ZQmAmKU0e3MOmBvS+3gK/nbYFNukoovZUTgYpeUBqEI+LaL+1ccCAKtFsIiAUKxunlNAC5Sr8tIpLll72GpqUpcRoK3hpsNLbSXVHlzqEoBBwEvH6e0GoKrRpypCoC4BkH/3ojrgOIejKpreTpTIvsd5dhZNXbcAzAbOVzHSmzPo6roFQL67Op+FybsMdqeuAdA9AR1bp3pEQrsEQH53jni0tcBGoHczQLTLKZD0VymlIkGXJ8TsKM+WtNtF0CPqvZrU9Rrg5WGFRgUA9ZgL5DHyjTqKCCgiINAlJ4+w9WaEPHR5NymmQDEFiikQ5qKjx6RskzVAPMHCVOd0/VXESkjRNd9vDoNK+0uvUazq9boPoGQqKcocVTOshllqLVh67iPg06LaoGqEZgCo8lIqPKRE9Jrqhq5yVWudTX6vpE1J3EEHX/E5Lpp+tQSgF/CiQiqdp8PV6DoRvUzTTdSSWE0B6V4fPb7YXk3PArTV3aHR8dM8cwBEquh6jA+zFMD3konlwKGkMcsIkB3Ra0faoCqcBlQjr3L94fQf1gA02tO2o5dfotxD2ZRtvTfUdqcHoHqRWiYhOyPjui2me4J6hmspGnHdANF1nNJqnyWhAbB0ukW6OzwAfwEljPdBHsaHcAAAAABJRU5ErkJggg==',
            trigger: (t, hideIcon) => {
                const el = getSelectionElement();
                const item = new ClipboardItem({
                    'text/html': new Blob([el.innerHTML], {type: 'text/html'}),
                    'text/plain': new Blob([el.innerText], {type: 'text/plain'}),
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
            image: 'https://ankiweb.net/logo.png',
            trigger: (t) => {
                addAnki(getSelectionElement()).catch(res => console.log(res))
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

    function buildOption(arr, select = '', key = 'k', val = 'v') {
        return arr.map(v => {
            if (typeof v === 'string') {
                let sel = '';
                if (v === select) {
                    sel = 'selected'
                }
                return `<option ${sel} value="${v}">${v}</option>`
            } else if (typeof v === 'object' || v instanceof Array) {
                let sel = '';
                if (v[key] === select) {
                    sel = 'selected'
                }
                return `<option ${sel} value="${v[key]}">${v[val]}</option>`
            }
            return ''
        }).join('\n');
    }

    function buildInput(rawStr = false, field = '', value = '', checked = false) {
        const li = document.createElement('div');
        const checkeds = checked ? 'checked' : '';
        li.className = 'form-item'
        li.innerHTML = `
            <input name="shadow-form-field[]" placeholder="字段名" value="${field}" class="swal2-input field-name">
            <input name="shadow-form-value[]" value="${value}" placeholder="字段值" class="swal2-input field-value"> 
            <div class="field-operate">
                <button class="minus">➖</button>
                <input type="radio" title="选中赋值" ${checkeds} name="shadow-form-defaut[]">
            </div>
        `;
        if (rawStr) {
            return li.outerHTML
        }
        document.querySelector('#shadowFields ol').appendChild(li)
    }

    function buildTextarea(rawStr = false, field = '', value = '', checked = false) {
        const li = document.createElement('div');
        const checkeds = checked ? 'checked' : '';
        li.className = 'form-item'
        li.innerHTML = `
            <input name="shadow-form-field[]" placeholder="字段名" value="${field}" class="swal2-input field-name">
            <div contenteditable="true"  class="mock-textarea swal2-textarea swal2-input" >${value}</div>
            <div class="field-operate">
                <button class="minus">➖</button>
                <input type="radio" title="选中赋值" ${checkeds} name="shadow-form-defaut[]">
                <button class="paste-html" title="粘贴">✍️</button>
                <button class="text-clean" title="清空">🧹</button>
            </div>
        `;
        if (rawStr) {
            return li.outerHTML
        }
        document.querySelector('#shadowFields ol').appendChild(li);
    }

    const entityMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };

    const entityMap2 = Object.keys(entityMap).reduce((pre, cur) => {
        pre[entityMap[cur]] = cur
        return pre
    }, {});

    function htmlSpecial(string) {
        return String(string).replace(/[&<>"'`=\/]/g, function (s) {
            return entityMap[s];
        });
    }

    function decodeHtmlSpecial(string) {
        return String(string).replace(/&(amp|lt|gt|quot|#39|#x2F|#x60|#x3D);/ig, function (s) {
            return entityMap2[s];
        });
    }

    async function addAnki(value = '') {
        let deckNames, models;
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
        let modelFields = GM_getValue('modelFields-' + model, [[1, '正面', false], [2, '背面', false]]);
        const deckName = GM_getValue('deckName', '');
        const lastValues = {ankiHost, model, deckName,}
        const deckNameOptions = buildOption(deckNames, deckName);
        const modelOptions = buildOption(models, model);
        const fieldFn = ['', buildInput, buildTextarea];
        const changeFn = ev => {
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
                        t = v[0] === 2 ? value.innerHTML : htmlSpecial(value.innerText);
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
            switch (ev.target.className) {
                case 'text-clean':
                    ev.target.parentElement.previousElementSibling.innerHTML = '';
                    break;
                case 'paste-html':
                    ev.target.parentElement.previousElementSibling.focus();
                    tapKeyboard('ctrl v')
                    break
                case 'minus':
                    ev.target.parentElement.parentElement.parentElement.removeChild(ev.target.parentElement.parentElement);
                    break
                case 'hammer':
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
                    break;
            }
        }
        document.addEventListener('click', clickFn)
        let ol = '';
        if (modelFields.length > 0) {
            ol = modelFields.map(v => {
                let t = value
                if (value instanceof HTMLElement) {
                    t = v[0] === 2 ? value.innerHTML : htmlSpecial(value.innerText);
                }
                return fieldFn[v[0]](true, v[1], v[2] ? t : '', v[2])
            }).join('\n')
        }
        await Swal.fire({
            title: "添加到anki(需要先装anki connector插件)",
            showCancelButton: true,
            width: 700,
            html: `
<style>
    .form-item {display: grid; grid-template-columns: 0fr auto 0fr;align-items: center }
    .form-label { width: 8rem}
    
    .form-item ol .form-item .swal2-input{padding: 5px;margin: 1em 5px 3px;}
    .form-item ol .form-item .field-name{width: 8rem}
    .form-item ol .form-item .field-value{width: 27rem}
    .form-item ol .form-item .mock-textarea{width: 27rem;padding: 5px;min-height: 17rem}
    #shadowAddField,.form-item > .field-operate > button,.form-item > .field-operate > input{
        cursor: pointer;
    }
    .swal2-input,.swal2-select {margin: 1em 1em 3px;}
    .btn-add-field{ width: 2rem; height: 2rem; margin-top: 1.5rem; }
    .mock-textarea {
    box-sizing: border-box;
    width: auto;
    transition: border-color .1s, box-shadow .1s;
    border: 1px solid hsl(0, 0%, 85%);
    border-radius: .1875em;
    background: rgba(0, 0, 0, 0);
    box-shadow: inset 0 1px 1px rgba(0, 0, 0, .06), 0 0 0 3px rgba(0, 0, 0, 0);
    color: inherit;
    overflow: auto;
    text-align: left;
    
    font-size: 1.125em;}
</style>
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
        <label for="shadowField" class="form-label">字段</label>
        <select id="shadowField" class="swal2-select">
            <option value="1">文本</option>
            <option value="2">富文本</option>
        </select>
        <button class="btn-add-field" id="shadowAddField">➕</button>
    </div>
    
    <div class="form-item" id="shadowFields">
        <ol>${ol}</ol>
    </div>
    
  `,
            focusConfirm: false,
            preConfirm: async () => {
                let form = {};
                Object.keys(lastValues).forEach(field => {
                    form[field] = document.getElementById(field).value;
                })
                let fields = {};
                let modelField = [];
                [...document.querySelectorAll('#shadowFields > ol > div')].forEach(div => {
                    const name = div.children[0].value;
                    if (name === '') {
                        return
                    }
                    modelField.push([
                        div.children[1].tagName === 'INPUT' ? 1 : 2,
                        name,
                        div.children[2].children[1].checked
                    ]);
                    fields[name] = div.children[1].tagName === 'INPUT' ? decodeHtmlSpecial(div.children[1].value) : div.children[1].innerHTML
                })

                if (Object.values(form).map(v => v === '' ? 0 : 1).reduce((p, c) => p + c, 0) < Object.keys(form).length) {
                    Swal.showValidationMessage('还有参数为空!请检查！');
                    return
                }
                const params = {
                    "note": {
                        "deckName": form.deckName,
                        "modelName": form.model,
                        "fields": fields,
                    }
                }
                const res = await anki('addNote', params);
                console.log(form, params, res);
                if (res.error !== null) {
                    Swal.showValidationMessage('添加出错：' + res.error);
                    return
                }
                Object.keys(lastValues).forEach(k => {
                    if (lastValues[k] !== form[k]) {
                        GM_setValue(k, form[k])
                    }
                })
                if (modelField.length !== modelFields.length || !modelField.every((v, i) => v === modelFields[i])) {
                    GM_setValue('modelFields-' + form.model, modelField)
                }
                Swal.fire({
                    html: "添加成功",
                    timer: 500,
                });
            }
        });
        document.removeEventListener('click', clickFn);
        document.removeEventListener('change', changeFn);
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

    async function tapKeyboard(keys) {
        await request('keys=' + parseKey(keys))
    }

    async function request(data, path = '', call = null) {
        if (typeof data === 'object') {
            data = Object.keys(data).map(k => {
                if (data[k] instanceof Array) {
                    return data[k].map(v => k + '=' + encodeURIComponent(v)).join('&')
                }
                return k + '=' + encodeURIComponent(data[k])
            }).join('&');
        }
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
        style.textContent = `
    /*组件样式*/
    :host{all:unset!important}
    :host{all:initial!important}
    *{word-wrap:break-word!important;word-break:break-word!important}
    a{color:#00c;text-decoration:none;cursor:pointer}
    a:hover{text-decoration:none}
    a:active{text-decoration:underline}
    img{cursor:pointer;display:inline-block;width:20px;height:20px;border:1px solid #dfe1e5;border-radius:4px;background-color:rgba(255,255,255,1);padding:2px;margin:0;margin-right:5px;box-sizing:content-box;vertical-align:middle}
    img:last-of-type{margin-right:auto}
    img:hover{border:1px solid #f90}
    img[activate]{border:1px solid #f90}
    img[activate]:hover{border:1px solid #f90}
    table{font-size:inherit;color:inherit}
    tr-icon{display:none;position:absolute;padding:0;margin:0;cursor:move;box-sizing:content-box;font-size:${fontSize}px;text-align:left;border:0;border-radius:4px;color:black;z-index:${zIndex};background:transparent}
    tr-icon[activate]{background:#fff;-webkit-box-shadow:0 3px 8px 0 rgba(0,0,0,0.2),0 0 0 0 rgba(0,0,0,0.08);box-shadow:0 3px 8px 0 rgba(0,0,0,0.2),0 0 0 0 rgba(0,0,0,0.08)}
    tr-audio{display:block;margin-bottom:5px}
    tr-audio a{margin-right:1em;font-size:80%}
    tr-audio a:last-of-type{margin-right:auto}
    tr-content{display:none;width:${trContentWidth}px;max-height:${trContentHeight}px;overflow-y: scroll;background:white;padding:2px 8px;margin-top:5px;box-sizing:content-box;font-family:"Helvetica Neue","Helvetica","Arial","sans-serif";font-size:${fontSize}px;font-weight:normal;line-height:normal;-webkit-font-smoothing:auto;font-smoothing:auto;text-rendering:auto}
    tr-engine~tr-engine{margin-top:1em}
    tr-engine .title{color:#00c;display:inline-block;font-weight:bold}
    tr-engine .title:hover{text-decoration:none}
    /*各引擎样式*/
    .word-details {
    position: relative
}
 
 
 
.word-details-header>p {
    line-height: 20px;
    margin: 0 0 20px
}
 
.word-details-header>p>span {
    color: #bac
}
 
.word-details .redirection {
    color: #fff;
    line-height: 20px;
    margin: 0 0 20px;
    opacity: .8
}
 
.word-details-tab {
    cursor: pointer;
    display: inline-block;
    margin: 0 15px 15px 0;
    height: 50px;
    border-radius: 5px;
    padding: 0 20px;
    background: #f5f8ff
}
 
.word-details-tab h2 {
    font-size: 18px;
    line-height: 30px;
    height: 35px;
    margin: 0;
    font-weight: 400;
    display: inline-block
}
 
.word-details-tab-active {
    color: #fff;
    background-color: #abc
}
 
.word-details-tab .pronounces {
    display: inline-block;
    line-height: 60px;
    height: 60px;
    vertical-align: top;
    margin-left: 20px
}
 
.word-details-pane {
    display: none
}
 
.word-details-pane:first-child {
    display: block
}
 
.word-details-pane-header {
    padding: 6px 10px;
    background-image: -webkit-linear-gradient(276deg,#544646,#7ed285);
    background-image: -o-linear-gradient(276deg,#544646,#7ed285);
    background-image: linear-gradient(276deg,#544646,#7ed285);
    border-top-left-radius: 5px;
    border-top-right-radius: 5px;
    color: #fff
}
 
.word-details-pane-header-multi {
    border-top-left-radius: 0;
    border-top-right-radius: 0
}
 
.word-details-pane-header .word-text {
    margin-bottom: 10px
}
 
.word-details-pane-header .word-text .add-to-scb-loading {
    background: url(img/loading-289f3.png) no-repeat 0 0/cover;
    -webkit-animation: xd-loading .6s steps(8) infinite both;
    animation: xd-loading .6s steps(8) infinite both
}
 
.word-details-pane-header .word-text .add-to-scb-success {
    background: url(data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAAAsCAYAAAAehFoBAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyhpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMDY3IDc5LjE1Nzc0NywgMjAxNS8wMy8zMC0yMzo0MDo0MiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTUgKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MTQ1N0M1MTRDMDRCMTFFNzlGNEY5NDYwNkM0QUE2NjciIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MTQ1N0M1MTVDMDRCMTFFNzlGNEY5NDYwNkM0QUE2NjciPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDoxNDU3QzUxMkMwNEIxMUU3OUY0Rjk0NjA2QzRBQTY2NyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDoxNDU3QzUxM0MwNEIxMUU3OUY0Rjk0NjA2QzRBQTY2NyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Pvx0vOAAAAJLSURBVHja7JkxSMNAFIbT1LGDYnEIRRBdrIOjk0uELkJFHDo5OEpQWlAcXHXTVSld3NwEB7t1ciw4VaRDxUGLIB1sESy0xv/ghvS8xGuauyDmwUfJJe/d3+Tl3V1O02C2bcfBPqiCri3furQv0mdcG8ao2IodnlWGEa2DAjC18MykGoQF57TwLTdMSnwyj2hStjr0kWT6/BT1jZGrBxpgKm6p33517Y9ZJDgSHAlWbGN+y9CwFlS5jFIiEuw3hyUM2fe+3oWw5hJRDv+bOuyVUgiRws8aWAWzwKCnmqABbsA1Qjx7CnGa6HVu5uJrgBLoCYTo0WuNUASjKQvaPhanxCerVDAOd0F/hBU18d3xJdjHEijrIrYG8iANEpQ0bau5iM5KFUxzts35eGIB3cNPp9d0OelhyBRc4og1SXhBTI7okhTBpHRxqoElKHQclMES9WGrR0qGYIuTs7qA2ClwR31aYJGT05YMwWUmZJ4KOgRHLmJJzj8wfq/ggGkryxBcZ0KSClBwHJ+AmEPsDHjkPP5N6uu0ugzBHSbkBvhi2s6o6HnwwnlB1+mfSTDnOioET4BLTn29Am9M2wfIOO6+EsG8lCDfoC9+GdXewTKT2z9SQsb0ssEcZ0AfbIFzF58WWAG3HN/B2IrLGsnbU+Z8EyxwKoeuqqyJDBzHtP0JzLmUOteBg/2gnVQ0NG+DaT9DczWgzZWi6OTHY7QTmvzsBS1Y9vQyqG2vIic1gp/AO0SPurFY9JjIB7dEUrQBE9giNKZY+MjL/G8BBgDu7CBuz18G6wAAAABJRU5ErkJggg==) 0 0/contain
}
 
.word-details-pane-header .word-text .word-info {
    margin-bottom: 20px
}
 
.word-details-pane-header .word-text h2 {
    font-size: 18px;
    line-height: 0;
    margin: 0;
    font-weight: 400;
    display: inline-block
}
 
.word-details-pane-header .word-text a,.word-details-pane-header .word-text button {
    display: inline-block;
    width: 20px;
    height: 20px;
    line-height: 50px;
    margin-left: 30px;
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAAAsCAYAAAAehFoBAAAABGdBTUEAALGPC/xhBQAAAp9JREFUWAntWbFOAkEQBbHESipCbOj8DAobEyz9ATqi0UQ/xsBPWNCY+AW2WtIZPkApMFHxvePOm5u7PQbclZAwyYSZ2zcz7/aG2727SgUyn89r0FvoE/QDGlpYg7VYs0YOZmEA9BG6KWFtM+k9nNk1tGM+Q/9A1iYHk5DwuQkZFmTngMsxU71wGJZb9J9pqJoza80qAyW4CpF+KHvdumyJrZId4dCXazfDuxlWM7CvfKerb0NOoGPA1+1y18OOCfZ2eOtm2NzDvnpQTPWLsM3mxvYSZoYKuHUtsXWEzT1svQ+X9TpytHCFz6Cn0Da0CaVMoGPoCHqPHK/4LRYSkVKMijbdEua0i+IBbkIH0E9nYDpADLHJyWRTpriFlR1NPY1z+WnEwgKuC31z4UuOM6ar8/ERPyM5QHwgAypxZDxgl9CvEviyIcZeyJxmwpkgg4NCnNkiss84fgU9htZjpc1jHNPCHOlM61EDl6UQ5GTP6jbgy5M+1Hln4liM0S9zmGvR0zAyspSNAYCE/NNIIYGODJWDtNVYB4c06UGEKQuUSaw28rWg+m7Q1/HL6mKcV0MKc7a89zCS6kLsy1wbSCa0C06I7aF7up9LpAPX8LkoSBliIfiWByx2HDNU2FPzSqcCy1yuYFIe6BTNogTp8XjFjGIFru19t4bC7yhQF0UOUHyqCYnxQpOEEcM8zJfINERLJMmD/IYgzI2MlCPprGjr2EkIwtx1STmhw0ssRQJKxqNYgR2HIMwtopQeenHlOnFMTyaCPQpxHw6+cOgX2g11Viu7mJ2gSzO/5viQu+TMkCzo5ufGB1vk+CVM4vCDbS99ffbKEI5J+9/Ax4l9fFjMERYzrffGlota/IjEpKEF7Lw9hP7LF6NkQkD8z4/5P0eRZrlVgPOgAAAAAElFTkSuQmCC) 0 0/contain;
    border: none;
    outline: none;
    cursor: pointer
}
 
 
 
.word-details-pane-footer {
    padding: 0 30px 30px
}
 
.word-details-pane mark.highlight {
    color: #2e94f7;
    background: none
}
 
 
.word-details-item:last-of-type {
    margin-bottom: 0
}
 
.word-details-item>h2 {
    display: none;
    font-size: 20px;
    line-height: 28px;
    margin: 0 0 20px;
    font-weight: 400
}
 
.word-details-button-expand {
    cursor: pointer
}
 
.word-details-button-feedback {
    padding: 10px 25px;
    font-size: 14px;
    border-radius: 20px;
    background-color: #fff;
    border: 1px solid #2e94f7;
    color: #2e94f7
}
 
.word-details a {
    color: #2e94f7
}
 
.word-details a:hover {
    text-decoration: underline
}
 
.word-details-ads,.word-details-ads-placeholder {
    display: none;
    min-height: 48px;
    padding: 10px 32px 10px 54px
}
 
.word-details-ads {
    position: absolute;
    left: 0
}
 
.word-details-ads-placeholder {
    position: relative;
    background: rgba(46,148,247,.1)
}
 
.word-details-ads-placeholder:before {
    content: "";
    width: 16px;
    height: 17px;
    position: absolute;
    top: 10px;
    left: 30px;
    top: 14px;
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAiCAYAAAA+stv/AAAAAXNSR0IArs4c6QAABTRJREFUWAm9Vn1oVlUYf851M5vkgixJbEb/hFLuryRNpT8ipGgWtcVmTEVZECV9qcQCZxGVUGF/BVnQh7GSmBgLYuhipUIzyFl/BK0N01n2MXAr53vvPU+/53zc9973vdt436AD9z7nnOfrd37nPOdeRf+hMXfNo9/HP0KIXnXdvneqCRVU4yQ+zE9cQb/+2UNR/ADFarjaOFUBYP5kDp2LP0Xy9aQ1UZ0aqhZATVWOZ/p3EtO9xlfxH6r+jb+qigOnigHwcMetFOku7IHNqdQ/1SYXv4oBYL/3E+u5pJTNy3rqfwPAP3asoShamUmogtrMuMJBZYfwcrSdIlAf4eAZafo3oBwrZ9IBnREAD229n09vWyS2WP1Cihklh+QxEhspQOIaOn2mIW/hfGrLc3xq814AnDbPtAo+uelFKoQ9pKnOBJ8srDLJJLkwYEAIEDxhvCoPABXiNgr1Dvp2pJt/6JqbZ5MLgAfbX0GS5xF8UDXuHzGOYbzSJItim1SkeQAm1PeVBjfMMS23YHUzTQz35oEoA8DH29uAfJehOOK+JHCsAcAlT6QwAABar+eRzfMSW+lMXnoczAQWtDCm76KLP72QscEgA4AHtlxLYfSmTS6B6fvEQevFJliaetOHXcT1dDbc6m15oH0FRbTd2ktyBzTSO3hg4x3eTmT29Oqp10nzNSQlDh84XhAj02Keb+YYAeUOEJltO/n4U+9SOLaWosL7MFiQVZtRAN+30VvudQkD3N+6EPv1sKHZHDLQrUN328A8wtXnD5+XWTYa6O+xSSrwF2BwUT5bWFWkl/GRlnUeQJGBQtgKymvt6mEoqRUt9YY4aGCDb7KrF73DJleyYQSyZEsT39KOCmS7BmQ6YQArbDOo/epEhjh4vsV81upLqkBY8JWRZcTuvYZe5kWaPuLG8UPMzXNKASwzh88EESNx1C38WYe9B2I9WK43Nt5W7B0YJ32ZJlLmzVNHn8dLEgDc11wPVHicgZeRvpoKF3Y7Eo45Zx/ESm8r0jxpUOm+03sWIru9dgvGCw3J3S4rl3veMGACPMsHNzxKTStOYG7MJvHJygA7FtJ6B6L47bDxL+ulsjB7CAMdUgFO0vyB8ofMnpO36OOTTcTqZ5Tf4sQm396EKb4AwDQvZSB9XZCeBTC1YIxoXMbQQSkH3P9wmEnzuse8vc4VQZm90cMy0bu+z+/1NQo5XRWoRw5cBO0T+XUudMLb77GpEkd9ul+pnmp/EQDFeyDSR7HsDQm9fguydZ63RRKn2GazF30QDKvWQ6PiVAQQc48FAAOhS8kLzffd0E54hZeeVxlLX86T2wOJ42OIWgAwH5KutBSA2sOkpiZgfJVVubdxRl+kNJ/LxS9LmCQXELmNwfKHXpPchOqx3nH8cO7NnAPZY6lbL9N9mZNHPs1eJp9p/9l2vqa0vT13q46+78oAmInaK/E1pHPmapVkJqF8lCSQJHKBvfSBvfSg0tLrRMZ8CaR3+uQiEyL9JL925+3Yo35wnv3B8AZle4DAyVxilN8Jglb19JfdaWUZAFHyq+s2YtkfYN/VrFWRjjZTXwV71K6BrlKTXABixC+vfhA333sAMd+ewGlNS2Nmx0rFiPGM6vx6X1ZhRzNG5ZfW4tcqPoCSvGXaKijdAYno54hG0d+mdp84kpdc5pIqyDNQnV8NEd/diIO5CQdxNOdrmV8lzL+hMp4kveTmmZJLzhkZSINiZkV7Vt8GRpowvwYrux7ueDQWEZwHS+cx/gYfq8PUeOMx1XIQJTN7+xcs/bB+XniprgAAAABJRU5ErkJggg==) no-repeat 0/100%
}
.audio {
    display: inline-block;
    width: 20px;
    height: 20px;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    vertical-align: middle;
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJwAAAA0CAYAAAB/91HOAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA3hpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMDY3IDc5LjE1Nzc0NywgMjAxNS8wMy8zMC0yMzo0MDo0MiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDozZDg2NTg3NC04Mzg3LTQ1MGItYmY3My0xODVlMTgwZWZlMjUiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MDIyNzg4MDRCMEFGMTFFN0I2N0ZGQkVCRDRBNkU4RUUiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MDIyNzg4MDNCMEFGMTFFN0I2N0ZGQkVCRDRBNkU4RUUiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTUgKE1hY2ludG9zaCkiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDplNDU0MTcwYi02NzIwLTRjOGMtOTYxNy05M2Q1OWFiNzA3NTIiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6M2Q4NjU4NzQtODM4Ny00NTBiLWJmNzMtMTg1ZTE4MGVmZTI1Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+ArAG/QAABIxJREFUeNrsnV1oHFUYhr8zu+ScVF2NEDBGsYogVi+SqghWsKSCF1LBCL3yQqmo6V6JV70ogSLUK/FmU1EsXnghqBFREMG/ohb8qa2IiiKkYBqFgG3TYmeS3fn8TpqU2TG7O5NkZs4m7wsfc/bkMJln5z2/MydRzEwQlJc8fAUQDAfBcBAEw0EwHATBcBAMB21OlZMUuvtVou+fJho+HBCHTKwUUWT9TitDW/uJfp/1iUmR5zEN3GRoZkrKS1o1pHjFXFG5QD1fjtHZoYl57tvWQzt3Eo0XAJ0lTyeNbzAeq8ma3/JnP1ZN7i3ciMRX6nxwbi70/xmq+dPy+UBSszso8DjapWqJw9SgT6Wu7WDmks2U9PXM4cEzvwSTXdalgyevLnUV2np6KnhHmvW7WhUQwN3v1fwnxqvmSBfcnMQ8kmzLMx7rYrqdJ+2D0Sxq5O4wVD/8D0YpGVqof5vzaG8XmC0dj1o8to5NzrOehrNN8iGJ9wWmr5lF/VFW3j3cw3c21w51u8NGWxWPHZS3DAbPenWp1/02678lV/FAvJEVmElztX5yYW5hboV2u89Rs4EnI540LZxtQGXyTd9InF/qvhcjYP+vSzDRwqquPPW8JB+TuAQTOHUTwFMAT9IWbmCoFrzJxCNLzm9Prui0otIepsax5bx62HDp5oAnOx5eoSKkauFUfSEC07G0+sTrNcOSOuZo9wKeAnk6Gm54wn8qMYxodJ9+SA6z0byLZ31n7g54iuXpaDhpH/fGashHvdrc2GZiHMbWc5xqDsBTLE+5M5C6I9ota9LPyGG6Vfmm52oObpcAT7E8nScNzFfGcv6kblb+PG0H0ZuNJ/U6nEyxXVsOWJPA49ikAYJgOAiGgyAYDoLhIBgOgmA4CIZbVK82pEpmw3wB4HHNcEpdiOXc0NV3BDxuG04R/xz97M8Hr8hhsFX50aqh0hZDnirbt0nduz858diyS/F2NDYaz3J+UpUT/KIjzHzv8mdJP0wNf7qDicPohbr0hkUBPHvAk6KFOzGmX5OL+jzpCScngo/l0N80rrjGnTFFXjx5VTIXeNKwJpk0sGf049JwfpHojMwPhhf9E5K6z9FhBHgK5Ek6S505WdUjylNj0lt/u8JANcZEg8yNo5J87nLf7ZVcukm58OQ4lCiMJy1jmmURe2Y7ILXjhasosh1WKzMgqaPNhbksF/OSJN+VqNg87Tk1iQBPNjxtt0qv18Lv37f1m10y/nzR7uCO1YBR/1xwXJJ2p/ctsRHvGUe7qdXz2BlbJBg8mRjOyu4z2688eiRuJIG6tc7hd/NMP8Wm9L86vGS0Kp6V9qg78m66EzxZPNr60PN4u0Adj3X2SsC2xDqB18l9peO5vP04Hgweyu6vJ50avFnvmJkKXhaIZ1usH33w6D79BnWHwNNqmaWWbothlg/v7Zv1Y1SiXdL7fy0AjaUR5Ywi70DfNj1KsS1rjgs8OS6LrEWfSdxfLutKxTPXnqwa+6zvBYk6dafAs5YpLP7XFpSn8D4cBMNBMBwEwXAQDAdBMBwEw0GbVP8JMAAdIoU8hRXz0AAAAABJRU5ErkJggg==) no-repeat -40px 0/auto 100%
}
 
.audio-light {
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJwAAAA0CAYAAAB/91HOAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA3hpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMDY3IDc5LjE1Nzc0NywgMjAxNS8wMy8zMC0yMzo0MDo0MiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDozZDg2NTg3NC04Mzg3LTQ1MGItYmY3My0xODVlMTgwZWZlMjUiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MDIyNzg4MDhCMEFGMTFFN0I2N0ZGQkVCRDRBNkU4RUUiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MDIyNzg4MDdCMEFGMTFFN0I2N0ZGQkVCRDRBNkU4RUUiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTUgKE1hY2ludG9zaCkiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDplNDU0MTcwYi02NzIwLTRjOGMtOTYxNy05M2Q1OWFiNzA3NTIiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6M2Q4NjU4NzQtODM4Ny00NTBiLWJmNzMtMTg1ZTE4MGVmZTI1Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+P83CLAAAAp5JREFUeNrsnM9LFGEch91dQbAQPAgJGdEt6OQSgt6ko/0D4clIu9a5zvsnWIYXr9EhCSJI9CBCUHryVLf0JEixUYdix8/AQsM0s/uO6zvzfeN54DnsMDszn32/+77zY9+tRVE0BFAWdT4CoOCAggOg4ICCA6DggIIDCs43l+S4rP0nnx15jBbcvNyV3+WpPJJP5XCgDUOeQYifNHhyRK5G+WzKusf9k8dgHl9hrsuPUX+WAmkc8lyQPobUu3JfNtOdqfyZWnY/gCGHPEbP4RqyJV93Tz6TfJG35a3U8puGG4Y8PvJcUFd5Re7kdMuv5Fhi3TQWhxzyeMpTZOWaXJYfZNth/P8tH2dsx0oDkaeCPK4rTsqtyJ0jOZuzLQsNRB5/eXq+v+bwA8z4RuD77v0aF+J178mTvFE8Y/tlQh6/eXq+36XgHsi1giennfMeUAmQx2+enu93uUpNXxq/lVPdDWUdTMf4bQHyVIhLD9eWlxOvr8mvA3wjqu4RyOM3z8BDar8DCK2Bys7jO6+1PAMPqQAmnzQAUHBAwQEFB0DBAQUHQMEBBQdw/oL7kXp9NfDM5KkQl6lgh3Im8fqZXJHHgTZQ2XlekucvLs9Sl+XzAtu0/nMe8hj/edILuV1gh+/khOEejjwV5qk7Vuyi3HHc5h15IGeNNhB5qsxTcJLGw4KTNB4Zn3RCnpLnNDCtjjxmpwn2syFbspNx0J9lU95ILT81/HcI5PGQx+UqtSgLcmPo39nd8Y5+ydHEsj05Z/w2CnmMP2l4I6flp4zL49HUsvUA7tuRp6KLBv7eijxm/64r6bzclX+6QY7lEzkcUOOQx/A5XB5xdz0iv2XcjQ4R8nh6tAVg+qIBgIIDCg4oOAAKDig4AAoOAuBMgAEAYBYyuvW+UO8AAAAASUVORK5CYII=)
}
 
.audio-state-playing {
    -webkit-animation: audio-playing .6s steps(3) infinite alternate;
    animation: audio-playing .6s steps(3) infinite alternate
}
 
@-webkit-keyframes audio-playing {
    0% {
        background-position: 0 0
    }
 
    to {
        background-position: -60px 0
    }
}
 
@keyframes audio-playing {
    0% {
        background-position: 0 0
    }
 
    to {
        background-position: -60px 0
    }
}
 
    .hjenglish dl,.hjenglish dt,.hjenglish dd,.hjenglish p,.hjenglish ul,.hjenglish li,.hjenglish h3{margin:0;padding:0;margin-block-start:0;margin-block-end:0;margin-inline-start:0;margin-inline-end:0}
    .hjenglish h3{font-size:1em;font-weight:normal}
    .hjenglish .detail-pron,.hjenglish .pronounces{color: #00c;}
    .hjenglish .detail-groups dd h3:before{counter-increment:eq;content:counter(eq) ".";display:block;width:22px;float:left}
    .detail-groups dd:first-of-type:last-of-type h3:before {
    display: none
}
 
.detail-groups dd:first-of-type:last-of-type h3 p {
    margin: 0
}
 
.detail-groups dd:first-of-type:last-of-type h3 p {
    margin: 0
}
 
.detail-groups dd:first-of-type:last-of-type ul {
    margin-left: 0
}
 
.detail-groups ul {
    //margin-left: 22px
}
 
.detail-groups ul li {
    color: #999;
    margin-bottom: 14px
}
 
.detail-groups ul li p {
    margin: 0 0 6px;
    line-height: 20px
}
 
.detail-pron {
    color: #999;
    margin-left: 6px;
    font-family: Lucida Sans Unicode
}
 
.detail .def-sentence-from {
    color: #666
}
 
.detail .def-sentence-to {
    color: #999
}
 
.detail .def-sentence-from .def-sentence-to span {
    vertical-align: top;
    margin: 1px 0 2px 2px;
    display: inline-block
}
 
.detail .def-tags span {
    border: 1px solid #999;
    color: #666;
    border-radius: 2px;
    display: inline-block;
    line-height: 16px;
    font-size: 12px;
    width: 36px;
    text-align: center;
    margin-right: 8px
}
 
    .hjenglish .detail-groups dl{counter-reset:eq;margin-bottom:.5em;clear:both}
    .hjenglish ol,.hjenglish ul{list-style:none}
    .hjenglish dd{margin-left:1em}
    .hjenglish dd>p{margin-left:2.5em}
    `;
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