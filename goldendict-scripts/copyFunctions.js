;

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

window['getBase64Image'] = getBase64Image;

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

function setMapVal(k, v, object = {}) {
    const names = k.split('.');
    while (true) {
        const name = names.splice(0, 1)[0] ?? '';
        if (!name) {
            return
        }
        if (names.length === 0) {
            object[name] = v;
            return;
        }
        if (!object?.[name]) {
            object[name] = {}
        }
        object = object[name]
    }
}

function PushWindowVarArray(k, v) {
    if (window?.[k]) {
        window[k].push(v);
        return
    }
    window[k] = [v];
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
};