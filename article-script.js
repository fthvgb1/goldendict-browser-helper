(function () {

    function getBase64Image(img, width, height) {
        const canvas = document.createElement('canvas')
        canvas.width = width || img.width
        canvas.height = height || img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        return canvas.toDataURL()
    }

    function getBase64(img) {
        const image = new Image()
        image.crossOrigin = ''
        image.src = img
        return new Promise((resolve) => {
            image.onload = function () {
                const base64Data = getBase64Image(image)
                resolve(base64Data)
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


    const fn = () => {
        let map = {};
        try {
            [...document.querySelectorAll('.gdarticle')].forEach(el => {
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
        `
                a.innerText = '✍️'
                a.addEventListener('click', () => {
                    let range = document.createRange() //创建range
                    let dict = el.querySelector('.mdict');
                    if (!dict) {
                        dict = el.querySelector('iframe').contentDocument.body;
                        if (!dict) {
                            return
                        }
                    } else {
                        dict = dict.parentElement
                    }
                    const srcChecker = /url\(\s*?['"]?\s*?(\S+?)\s*?["']?\s*?\)/i;

                    const copyFn = async () => {
                        for (const node of [...dict.querySelectorAll('*')]) {
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
                        [...dict.querySelectorAll('img')].forEach(img => {
                            try {
                                img.src = getBase64Image(img);
                            } catch (e) {
                                console.log(e);
                            }

                        })
                        //range.selectNode和range.selectNodeContents。其中selectNode表示选中整个节点而selectNodeContents表示选中节点中的内容，针对文字的复制需要选中节点的内容，而图片的复制需要选中节点本身。
                        range.selectNode(dict);
                        let selection = window.getSelection() //获取selection对象
                        if (selection.rangeCount > 0) {
                            //如果有已经选中的区域，直接全部去除
                            selection.removeAllRanges()
                        }
                        selection.addRange(range); //加入到选区中
                        if (document.queryCommandSupported && document.queryCommandSupported('copy')) {
                            //先检测是否支持document.queryCommandSupported和copy指令
                            //如果都支持直接执行指令
                            document.execCommand('copy')
                            //去除选中区域，取消拖蓝效果
                            selection.removeAllRanges()
                        }
                    }
                    copyFn().catch(r => console.log(r))

                })
                el.insertBefore(a, el.querySelector('.gddictnamebodyseparator').nextElementSibling)

            });
        } catch (e) {
            console.log(e)
        }
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", fn);
    } else {
        fn()
    }

})()

