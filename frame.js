const start = (iconArray, initialFns = []) => {
    String.prototype.replaceWithMap = function (m) {
        let s = this;
        Object.keys(k => {
            s = s.replaceAll(k, m[k]);
        })
        return s
    }
    /**样式*/
    const style = document.createElement('style');
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
    iframe.style.display = 'none';
    let icon = document.createElement('tr-icon'); //翻译图标
    let content = document.createElement('tr-content'), // 内容面板
        contentList = document.createElement('div'), //翻译内容结果集（HTML内容）列表
        selected, // 当前选中文本
        pageX, // 图标显示的 X 坐标
        pageY; // 图标显示的 Y 坐标
    // 初始化内容面板
    content.appendChild(contentList);

    // 绑定图标拖动事件
    const iconDrag = new Drag(icon);
    // 图标数组
    let hideCalls = []
    // 添加翻译引擎图标
    iconArray.forEach(obj => {
        const img = document.createElement('img');
        img.setAttribute('src', obj.image);
        img.setAttribute('alt', obj.name);
        img.setAttribute('title', obj.name);
        img.setAttribute('icon-id', obj.id);
        img.addEventListener('mouseup', (event) => {
            obj.trigger(selected, hideIcon, event);
        });
        icon.appendChild(img);
        if (obj.hide) {
            hideCalls.push(obj.hide)
        }
        if (obj.hasOwnProperty('otherAttributes') && obj.otherAttributes) {
            Object.keys(obj.otherAttributes).forEach(k => img[k] = obj[k]);
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
    // iframe 工具库加入 Shadow
    shadow.appendChild(iframe);
    iframeWin = iframe.contentWindow;

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
    initialFns.length > 0 && initialFns.forEach(fn => fn(shadow))
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

    /**日志输出*/
    function log() {
        const debug = false;
        if (!debug) {
            return;
        }
        if (arguments) {
            for (let i = 0; i < arguments.length; i++) {
                console.log(arguments[i]);
            }
        }
    }

    /**鼠标拖动*/
    function Drag(element) {
        this.dragging = false;
        this.mouseDownPositionX = 0;
        this.mouseDownPositionY = 0;
        this.elementOriginalLeft = parseInt(element.style.left);
        this.elementOriginalTop = parseInt(element.style.top);
        const ref = this;
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
        content.style.display = 'none';
        pageX = 0;
        pageY = 0;
        forceStopDrag();
        if (hideCalls.length > 0) {
            hideCalls.forEach(fn => {
                fn(icon)
            })
        }
    }
}