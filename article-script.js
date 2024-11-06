const fn = () => {
    [...document.querySelectorAll('.gdarticle')].forEach(el => {
        const a = document.createElement('a');
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
            const dict = el.querySelector('.mdict');
            //range.selectNode和range.selectNodeContents。其中selectNode表示选中整个节点而selectNodeContents表示选中节点中的内容，针对文字的复制需要选中节点的内容，而图片的复制需要选中节点本身。
            range.selectNode(dict);
            let selection = window.getSelection() //获取selection对象
            if (selection.rangeCount > 0) {
                //如果有已经选中的区域，直接全部去除
                selection.removeAllRanges()
            }
            selection.addRange(range) //加入到选区中
            if (document.queryCommandSupported && document.queryCommandSupported('copy')) {
                //先检测是否支持document.queryCommandSupported和copy指令
                //如果都支持直接执行指令
                document.execCommand('copy')
                //去除选中区域，取消拖蓝效果
                selection.removeAllRanges()
            }
        })
        el.insertBefore(a, el.querySelector('.gddictnamebodyseparator').nextElementSibling)

    })
}
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn);
} else {
    fn()
}
