;(() => {
    superFetchHook.hookLang({
        'displacement': '位运算',
        'leftDisplacement': '<<',
        'rightDisplacement': '>>',
        'log': '打印到控制台',
        'log-desc': '可使用{变量},{$vars}为所有变量，为空打印当前变量',
        'trim': '去除两边看不见字符',
    });
    const lang = superFetchHook.lang;
    const calculator = superFetchHook.valueHandlers.simpleCalculator;
    calculator.displacementOperate = {
        leftDisplacement: (num1, num2) => num1 << num2,
        rightDisplacement: (num1, num2) => num1 >> num2,
    };
    calculator.handlers.displacement = {
        ...calculator.handlers.calculator,
        fn(value, item, param) {
            const num = 'variable' === item.operatedTarget ? superFetchHook.getVariable(param.vars, item.operatedNumber, 0) : Number(item.operatedNumber);
            return calculator.displacementOperate[item.operator](Number(value), num)
        },
        text: lang('displacement'),
        param: {
            ...calculator.handlers.calculator.param,
            fields: {
                ...calculator.handlers.calculator.param.fields,
                operator: {
                    ...calculator.handlers.calculator.param.fields.operator,
                    diffSelector: '[name=operator]:has(option[name=leftDisplacement])',
                    getOptions(val) {
                        const o = Object.keys(calculator.displacementOperate)
                            .map(k => [k, superFetchHook.mapTitle[k] ?? k]);
                        return buildOption(o, val, 0, 1)
                    }
                }
            },
        },
    };


    superFetchHook.valueHandlers.log = {
        reg: /\{(.*?)}/g,
        handle(item, value, eleParam) {
            const express = item.searchValue;
            if (!express) {
                console.log(value);
                return value
            }
            const vars = eleParam?.vars ?? {};
            if (Object.keys(vars).length < 1) {
                vars['value'] = value;
            }
            const arr = [];
            let r, i = 0;
            while ((r = this.reg.exec(express)) !== null) {
                arr.push(express.slice(i, r.index));
                i = r.index + r[0].length;
                const v = '$vars' === r[1] ? vars : superFetchHook.getVariable(vars, r[1], r[0]);
                arr.push(v);
            }
            i < express.length && arr.push(express.slice(i));
            console.log(...arr);
            return value;
        },
        renderHook(li) {
            li.querySelectorAll('[name=searchValue] ~:not(button)').forEach(el => el.classList.add('hidden'));
            const input = li.querySelector('[name=searchValue]');
            input.style.width = '20vw';
            input.title = lang('log-desc');
        }
    }

    superFetchHook.valueHandlers.simpleValueHandlers.handlers.trim = s => s.trim();


})();