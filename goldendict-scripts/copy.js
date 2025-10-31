;(function () {
    const copySign = '____customize-copy';
    if (window.hasOwnProperty(copySign)) {
        return
    }

    function getImageBlob(img, width = null, height = null, call = null) {
        if (img.src.toLocaleString().includes('.svg')) {
            return getSvg(img)
        }
        return new Promise(resolve => buildCanvas(img, width, height, call).toBlob(resolve));
    }

    function getSvg(img, type = 'blob') {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', img.src);
            xhr.onerror = reject;
            xhr.onload = response => {
                const r = response.target.responseText;
                const im = new Image(img.clientWidth, img.clientHeight);
                im.onload = async () => {
                    if (type === 'blob') {
                        const b = await getImageBlob(im, img.clientWidth, img.clientHeight, (ctx) => {
                            ctx.fillStyle = "#fff";
                            ctx.fillRect(0, 0, img.clientWidth, img.clientHeight);
                        });
                        resolve(b);
                        return
                    }
                    resolve(await getBase64Image(im, img.clientWidth, img.clientHeight));
                }
                im.src = 'data:image/svg+xml;base64,' + btoa(r);
            }
            xhr.send();
        });
    }

    function buildCanvas(img, width = null, height = null, call = null) {
        const canvas = document.createElement('canvas');
        canvas.width = width || img.naturalWidth;
        canvas.height = height || img.naturalHeight;
        const ctx = canvas.getContext('2d');
        call && call(ctx);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas
    }

    async function getBase64Image(img, width = null, height = null, call = null) {
        if (img.src.toLocaleString().includes('.svg')) {
            return await getSvg(img, 'base64');
        }
        return buildCanvas(img, width, height, call).toDataURL()
    }

    function getBase64(img) {
        const image = new Image();
        image.crossOrigin = '';
        image.src = img;
        return new Promise((resolve) => {
            image.onload = function () {
                const base64Data = getBase64Image(image);
                resolve(base64Data);
            }
        })
    }

    function isVisible(el) {
        let loopable = true,
            visible = getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';

        while (loopable && visible) {
            el = el.parentNode;
            if (el && el !== document.body) {
                visible = getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
            } else {
                loopable = false;
            }
        }

        return visible;
    }

    function checkConfAndInsertButton(el, dict, a, dictName) {
        return (...configs) => {
            configs.forEach(config => {
                if (!window.hasOwnProperty(config.name) || !window[config.name].hasOwnProperty(dictName)) {
                    return
                }
                const elements = dict.querySelectorAll(window[config.name][dictName]);
                if (elements.length < 1) {
                    return;
                }
                const imgCopy = a.cloneNode(true);
                imgCopy.title = config.title;
                imgCopy.innerText = config.innerText;
                imgCopy.addEventListener('click', ev => config.click(elements, ev));
                a.insertAdjacentElement('beforebegin', imgCopy);
            })
        };
    }

    function copySpecifyElement() {
        return {
            name: 'copyElementMap',
            title: 'copy elements',
            innerText: '🎀',
            click: (elements) => copyElement(elements[0])
        }
    }

    function htmlToImages() {
        const reg = /\d+(\.\d*)*/;
        const offsetFn = (x, y) => {
            return [x, y]
                .map(v => Math.ceil(parseFloat(reg.exec(v)[0] ?? '0')))
                .reduce((previousValue, currentValue) => previousValue + currentValue, 0);
        }
        return {
            name: 'dictElementToImageMap',
            title: 'copy elements to images',
            innerText: '🧰',
            click: async (elements) => {
                const images = [];
                for (const ele of elements) {
                    const imms = ele.querySelectorAll('img');
                    for (const imm of imms) {
                        imm.src = await getBase64Image(imm);
                    }
                    const s = getComputedStyle(ele);
                    const ss = {};
                    Object.keys(s).forEach(k => /\d+/.test(k) ? '' : ss[k] = s[k]);
                    const dataUrl = await htmlToImage.toPng(ele, {
                        width: ele.clientWidth + offsetFn(ss.paddingRight, ss.paddingLeft),
                        height: ele.clientHeight + offsetFn(ss.paddingTop, ss.paddingBottom),
                        pixelRatio: 1,
                        style: ss
                    });
                    const im = new Image();
                    im.src = dataUrl;
                    images.push(im);
                }
                await copyImgs(images, true);
                showToast('copy success!');
            }
        }

        /*const copyStyle = (cloneEle, el) => {
            const s = getComputedStyle(el);
            const ss = {};
            Object.keys(s).forEach(k => /\d+/.test(k) ? '' : ss[k] = s[k]);
            Object.assign(cloneEle.style, ss);
            if (cloneEle.children.length > 0) {
                [...cloneEle.children].forEach((child, i) => {
                    copyStyle(child, el.children[i]);
                })
            }
        };*/
    }

    async function copyImgs(images, hadBase64 = false) {
        const div = document.createElement('div');

        const had = {};
        for (const img of images) {
            if (had.hasOwnProperty(img.src)) {
                continue
            }
            if (hadBase64) {
                div.appendChild(img);
            } else {
                const i = document.createElement('img');
                i.src = await getBase64Image(img);
                div.appendChild(i);
            }

            had[img.src] = '';
        }
        const item = new ClipboardItem({
            'text/html': new Blob([div.innerHTML], {type: 'text/html'}),
        })
        await navigator.clipboard.write([item]).catch(console.log);
        !hadBase64 && imgs.splice(0).forEach(cancelSelecting);
    }

    function copyImages() {
        return {
            name: 'dictImageMap',
            title: 'copy images',
            innerText: '🧲',
            click: async images => {
                if (imgs.length > 0) {
                    await copyImgs(imgs);
                    showToast('copy selected images success!');
                    return
                }
                await copyImgs(images);
                showToast('copy images success!');
            }
        }
    }

    async function copyElement(ele) {
        const range = document.createRange() //创建range
        for (const node of [...ele.querySelectorAll('*')]) {
            const style = getComputedStyle(node);
            let prop = style.getPropertyValue('background-image'); // 从样式中获取background-image属性值。
            if (prop === 'none' || !isVisible(node)) {
                continue
            }

            let match = srcChecker.exec(prop);
            if (!match) {
                continue
            }
            if (map.hasOwnProperty(match[1])) {
                node.style.cssText = `background-image:url('${map[match[1]]}')`;
                continue;
            }
            try {
                const b = await getBase64(match[1]);
                if (typeof b === 'string') {
                    node.style.cssText = `background-image:url('${b}')`;
                    map[match[1]] = b;
                }
            } catch (e) {
                console.log(e);
            }
        }
        for (const img of ele.querySelectorAll('img')) {
            try {
                img.src = await getBase64Image(img);
                const title = img.getAttribute('data-title');
                img.title = title ? title : '';
                !img.title && img.removeAttribute(title);
            } catch (e) {
                console.log(e);
            }
        }
        //range.selectNode和range.selectNodeContents。其中selectNode表示选中整个节点而selectNodeContents表示选中节点中的内容，针对文字的复制需要选中节点的内容，而图片的复制需要选中节点本身。
        range.selectNode(ele);
        let selection = window.getSelection() //获取selection对象
        if (selection.rangeCount > 0) {
            //如果有已经选中的区域，直接全部去除
            selection.removeAllRanges()
        }
        selection.addRange(range); //加入到选区中
        if (document.queryCommandSupported && document.queryCommandSupported('copy')) {
            //先检测是否支持document.queryCommandSupported和copy指令
            //如果都支持直接执行指令
            document.execCommand('copy');
            //去除选中区域，取消拖蓝效果
            selection.removeAllRanges();
            showToast('copy success!');
        }
    }

    window['copyElement'] = copyElement;

    function getDictEle(button) {
        let dict = button.querySelector('.mdict');
        if (!dict) {
            dict = button.querySelector('iframe').contentDocument.body;
            if (!dict) {
                return
            }
        } else {
            dict = dict.parentElement
        }
        return dict
    }


    let map = {};
    const srcChecker = /url\(\s*?['"]?\s*?(\S+?)\s*?["']?\s*?\)/i;
    document.querySelectorAll('.gdarticle').forEach(el => {
        const a = document.createElement('a');
        a.title = 'copy';
        a.style.cssText = `
        float: right;
    display: grid;
    place-items: center;
    cursor: pointer;
    border-radius: 4px;
    padding: 3px;
    transition: background-color 0.2s;
    position: relative;
    z-index: 45453;
        `
        a.innerText = '✍️';
        a.addEventListener('click', () => {
            const dict = getDictEle(el);
            copyElement(dict).catch(console.log);

        });
        el.insertBefore(a, el.querySelector('.gddictnamebodyseparator').nextElementSibling);
        const dictName = el.querySelector('.gddicttitle').innerText;
        const dict = getDictEle(el);
        checkConfAndInsertButton(el, dict, a, dictName)(
            copySpecifyElement(),
            htmlToImages(),
            copyImages(),
        )

    });

    async function copySingleImage(ev) {
        if (ev.target.tagName !== 'IMG') {
            return
        }
        ev.preventDefault();
        if (imgs.length > 0) {
            await copyImgs(imgs);
            showToast('copy selected images success!');
            return
        }
        const blob = await getImageBlob(ev.target);
        const data = [new ClipboardItem({[blob.type]: blob})];
        await navigator.clipboard.write(data);
        showToast('copy this image success!');
    }

    function cancelSelecting(img) {
        img.classList.remove('img-selected');
    }

    const imgs = [];

    function selectImage(ev) {
        if (ev.which !== 1) {
            return;
        }
        const cw = ev.target.clientWidth;
        const ch = ev.target.clientHeight;
        if (cw < 20 && ch < 20) {
            return;
        }
        if (ev.target.tagName !== 'IMG' && !ev.target.matches('a[title="copy images"]')) {
            if (imgs.length > 0) {
                showToast('abandoned selected images!');
            }
            imgs.splice(0).forEach(cancelSelecting);
            return
        }
        if (ev.target.tagName !== 'IMG') {
            return;
        }
        ev.target.setAttribute('stop', false);
        const w = cw - ev.offsetX;
        const h = ch - ev.offsetY;
        //console.log(w / ev.target.clientHeight, h / ev.target.clientHeight, ev);
        if (w / ev.target.clientHeight <= 0.3 && h / ev.target.clientHeight >= 0.7) {
            ev.target.setAttribute('stop', true);
            const index = imgs.indexOf(ev.target)
            if (index < 0) {
                imgs.push(ev.target);
                ev.target.classList.add('img-selected');
                showToast('selected this image!');
                return;
            }

            imgs.splice(index, 1).forEach(cancelSelecting);
            showToast('canceled this image selecting!');
        }
    }

    function showToast(message, duration = 1500) {
        const toast = document.getElementById("___toast-container");
        toast.innerText = message;
        toast.classList.add("show");
        const t = setTimeout(() => {
            toast.classList.remove("show");
            clearTimeout(t);
        }, duration);
    }

    function stop(ev) {
        if (ev.target.tagName !== 'IMG') {
            return;
        }
        if (ev.target.getAttribute('stop') === 'true') {
            ev.stopPropagation();
            ev.stopImmediatePropagation();
            ev.target.setAttribute('stop', false);
        }
    }

    document.querySelectorAll('img').forEach(img => {
        if (img.clientHeight < 50 && img.clientWidth < 50) {
            return
        }
        img.setAttribute('data-title', img.title);
        img.title = 'select this image when click image top right concern, right click mouse copy selected or single this images';
    })
    document.addEventListener('click', stop, true);
    document.addEventListener('mousedown', selectImage);
    document.addEventListener('contextmenu', copySingleImage);

    const s = `
    img:hover { border: black 1px dashed; }
    .img-selected{ border: brown 1px dashed !important;}
    
#___toast-container {
  display: none; 
  background-color: #FEFFC4; 
  text-align: center; 
  border-radius: 2px; 
  padding: .5rem; 
  position: fixed; 
  z-index: 100; 
  border: 2px solid black;
  font-size: 1.2rem;
  left: 4%;
  bottom: 4%;
  opacity: 0; 
  transition: opacity 0.5s, bottom 0.5s; /* Smooth transitions */
}

#___toast-container.show {
  display: block; 
  opacity: 1; 
}
    `

    if (!document.querySelector('#___toast-container')) {
        const div = document.createElement('div');
        div.id = '___toast-container';
        document.body.appendChild(div);
        const style = document.createElement('style');
        style.innerText = s;
        document.head.appendChild(style);
    }
    window.showToast = showToast;
    window[copySign] = true
})();