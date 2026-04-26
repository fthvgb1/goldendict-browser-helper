;(() => {
    const lang = superFetchHook.lang;
    superFetchHook.hookLang({
        'capitalize': '首字母大写',
        'htmlFns': 'html相关',
        'toElement': '字符转成元素对象',
        'getAttribute': '获取元素属性',
        'getAttribute-desc': '此时替换值为属性名，模式为参数，多个用|分隔，如果是方法名的话就返回执行结果',
        'getComputedStyle': '获取元素样式',
        'getComputedStyle-desc': '获取元素样式，此时替换为属性名，模式为伪类',
        'valueRelation': '值相关',
        'getVal': '取值',
        'getVal-desc': '从符号表中取值，替换项为变量名，无需{}',
        'str2Int': '字符转整数',
        'str2Float': '字符转浮点数',
        'str2Array': '字符转数组',
        'str2Array-desc': '此时替换值项为分隔符',
        'array2str': '数组转字符串',
        'array2str-desc': '此时替换值项为分隔符',
    });
    superFetchHook.mergeMap(superFetchHook.valueHandlers.simpleValueHandlers.handlers, {
        capitalize: s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(),
    })
    superFetchHook.mergeMap(superFetchHook.valueHandlers.codeRelate.handlers, {
        jsonEncode: JSON.stringify,
        jsonDecode: JSON.parse,
    });

    superFetchHook.simpleValueHandlerHelper.addHandlers('htmlFns', {
        toElement: s => superFetchHook.templateHelper.createElement('div', s).children[0],
        getAttribute(el, item) {
            const v = superFetchHook.getVarVal(el, item.replaceValue);
            if ('function' !== typeof v) {
                return v
            }
            const call = v.bind(el);
            const p = item.pattern ? item.pattern.split('|') : '';
            return p ? call(...p) : call();
        },
        getComputedStyle(el, item) {
            return superFetchHook.getVarVal(getComputedStyle(el, item.pattern ? item.pattern : null), item.replaceValue)
        },
    });

    superFetchHook.simpleValueHandlerHelper.addHandlers('valueRelation', {
        getVal: {
            fn: (val, item, param) => superFetchHook.getVarVal(param.vars, item.replaceValue),
            showInput: 'replaceValue', // replaceValue|pattern
        },
        str2Int: parseInt,
        str2Float: parseFloat,
        str2Array: (s, item) => s.split(item.replaceValue),
        array2str: (arr, item) => arr.join(item.replaceValue),
    });


    // todo add other sector function, like curl call local program, math and so on.

})();