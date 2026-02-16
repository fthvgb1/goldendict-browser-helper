;(() => {
    const fields = ['maxWidth', 'minWidth', 'maxHeight', 'minHeight'];

    setMapVal('beforeCopyEleToImg.DK Chinese-English Bilingual Visual Dictionary', dkDict, window);
    setMapVal('beforeCopyEleToImg.AHD双解', ADH, window);

    async function ADH(ele, afterCopyFns, imgBase64Fn, imgParam, offsetFn) {
        await imgBase64Fn(ele);
        const style = imgParam.style;
        imgParam.width = ele.clientWidth + offsetFn(style.paddingRight, style.paddingLeft);
        imgParam.height = ele.clientHeight + offsetFn(style.paddingTop, style.paddingBottom);
    }

    async function dkDict(ele, afterCopyFns, imgBase64Fn, imgParam, offsetFn) {
        let maxSize = ele.clientWidth * ele.clientHeight, mh = ele.clientHeight, mw = ele.clientWidth, size = maxSize;
        const images = ele.querySelectorAll('img');
        for (const image of images) {
            const size = image.naturalHeight * image.naturalWidth;
            if (size > maxSize) {
                maxSize = size;
                mh = image.naturalHeight;
                mw = image.naturalWidth;
            }
            image.src = await getBase64Image(image);
            if (image.naturalWidth * image.naturalHeight > image.clientHeight * image.clientWidth) {
                const ww = image.style.width, hh = image.style.height;
                image.style.height = image.naturalHeight + 'px';
                image.style.width = image.naturalWidth + 'px';
                const m = {};
                fields.forEach(f => (m[f] = image.style[f], image.style[f] = f.includes('Width') ? (image.naturalWidth + 'px') : (image.naturalHeight + 'px')));
                afterCopyFns.push(() => {
                    fields.forEach(f => image.style[f] = m[f]);
                    image.style.width = ww;
                    image.style.height = hh;
                });
            }
        }
        if (maxSize !== size) {
            const w = ele.style.width, h = ele.style.height;
            ele.style.width = mw + 'px';
            ele.style.height = mh + 'px';
            const m = {};
            fields.forEach(f => (m[f] = ele.style[f], ele.style[f] = f.includes('Width') ? (mw + 'px') : (mh + 'px')));
            afterCopyFns.push(() => {
                fields.forEach(f => ele.style[f] = m[f]);
                ele.style.width = w;
                ele.style.height = h;
            });
        }
        imgParam.width = mw + offsetFn(imgParam.style.paddingRight, imgParam.style.paddingLeft);
        imgParam.height = mh + offsetFn(imgParam.style.paddingTop, imgParam.style.paddingBottom);
    }
})();