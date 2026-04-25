;(() => {

    superFetchHook.hookLang({
        'capitalize': '首字母大写',
        'htmlFns': 'html相关',
        'toElement': '字符转成元素对象',
        'getAttribute': '获取元素属性',
        'getAttribute-desc': '此时替换值为属性名，模式为参数，多个用|分隔，如果是方法名的话就返回执行结果',
        'getComputedStyle': '获取元素样式',
        'getComputedStyle-desc': '获取元素样式，此时替换为属性名，模式为伪类',
    });

    superFetchHook.valueHandlers.simpleValueHandlers.childrenHandlers.capitalize = s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

    const lang = superFetchHook.lang;
    const htmlFns = {
        toElement: s => superFetchHook.templateHelper.createElement('div', s).children[0],
        getAttribute: {
            text: lang('getAttribute'),
            title: lang('getAttribute-desc'),
            fn(el, item) {
                const v = superFetchHook.getVarVal(el, item.replaceValue);
                if ('function' !== typeof v) {
                    return v
                }
                const call = v.bind(el);
                const p = item.replace_regex_pattern ? item.replace_regex_pattern.split('|') : '';
                return p ? call(...p) : v();
            }
        },
        getComputedStyle: {
            text: lang('getComputedStyle'),
            title: lang('getComputedStyle-desc'),
            fn: (el, item) => superFetchHook.getVarVal(getComputedStyle(el, item.replace_regex_pattern ? item.replace_regex_pattern : null), item.replaceValue),
        },
    };
    superFetchHook.valueHandlers.htmlFns = {
        text: lang('htmlFns'),
        title: lang('htmlFns'),
        childrenHandlers: htmlFns,
        ...superFetchHook.simpleValueHandlerHelper.build(htmlFns)
    };
})();