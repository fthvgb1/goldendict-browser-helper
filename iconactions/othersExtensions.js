;(() => {
    superFetchHook.hookLang({
        'displacement': '位运算',
        'leftDisplacement': '<<',
        'rightDisplacement': '>>',
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
})();