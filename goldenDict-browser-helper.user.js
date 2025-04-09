// ==UserScript==
// @name         goldenDict-browser-helper
// @namespace    https://github.com/fthvgb1
// @homepage     https://github.com/fthvgb1/goldendict-browser-helper
// @version      1.14
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

// @require      https://github.com/fthvgb1/goldendict-browser-helper/raw/refs/heads/master/libs/frame.js
// @require      https://github.com/fthvgb1/goldendict-browser-helper/raw/refs/heads/master/libs/lemmatizer.js
// @require      https://github.com/fthvgb1/goldendict-browser-helper/raw/refs/heads/master/libs/lemmatizerStarter.js
// @require      https://github.com/fthvgb1/goldendict-browser-helper/raw/refs/heads/master/libs/text.js
// @require      https://github.com/fthvgb1/goldendict-browser-helper/raw/refs/heads/master/libs/resizeimg.js
// @require      https://github.com/fthvgb1/goldendict-browser-helper/raw/refs/heads/master/libs/spell.js

// @require      https://github.com/fthvgb1/goldendict-browser-helper/raw/refs/heads/master/iconactions/goldendict.js
// @require      https://github.com/fthvgb1/goldendict-browser-helper/raw/refs/heads/master/iconactions/tts.js
// @require      https://github.com/fthvgb1/goldendict-browser-helper/raw/refs/heads/master/iconactions/forcecopy.js
// @require      https://github.com/fthvgb1/goldendict-browser-helper/raw/refs/heads/master/iconactions/anki.js
// @require      https://github.com/fthvgb1/goldendict-browser-helper/raw/refs/heads/master/iconactions/extractsentence.js

// @require      https://github.com/fthvgb1/goldendict-browser-helper/raw/refs/heads/master/contextmenuactions/menus.js

// @resource icon-anki https://github.com/fthvgb1/goldendict-browser-helper/blob/master/icon/anki.png?raw=true
// @resource icon-copy https://github.com/fthvgb1/goldendict-browser-helper/blob/master/icon/copy.png?raw=true
// @resource icon-goldenDict https://github.com/fthvgb1/goldendict-browser-helper/blob/master/icon/goldenDict.png?raw=true
// @resource icon-speak https://github.com/fthvgb1/goldendict-browser-helper/blob/master/icon/speak.png?raw=true

// @resource spell-css https://github.com/ninja33/ODH/raw/refs/heads/master/src/fg/css/spell.css
// @resource frame-css https://github.com/ninja33/ODH/raw/refs/heads/master/src/fg/css/frame.css
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

    initContextMenu();

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            initIconActions();
        });
    } else {
        initIconActions();
    }

})();