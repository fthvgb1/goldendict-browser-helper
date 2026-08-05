//altered from https://github.com/ninja33/ODH/blob/master/src/fg/js/spell.js
;const {spell, spellRichEditor} = (() => {
    const customButtons = [], stateFns = [];

    async function spell(field) {
        let exec = (command, value = null) => document.execCommand(command, false, value)
        let ensureHTTP = url => /^https?:\//.test(url) ? url : `https://${url}`
        let $ = async (tag, props, children = [], elm = document.createElement(tag)) => {
            for (const child of children) {
                const c = await child;
                c && elm.appendChild(c)
            }
            Object.assign(elm, props);
            return elm;
        }

        let colorPicker = _ => $('input', {type: 'color'})
        let select = options => $('select', {}, options.map(o => $('option', {textContent: o})));

        let buttons = {};
        let queryState = _ => {
            for (const cmd in buttons) {
                buttons[cmd].classList.toggle('selected', document.queryCommandState(cmd));
            }
            stateFns.forEach(fn => fn());
        }

        const actions = [
            [
                ['bold'],
                ['italic'],
                ['underline']
            ],
            [
                ['paragraph', '<p>'],
                ['quote', '<blockquote>'],
                ['code', '<pre>']
            ].map(([title, format]) => [title, _ => exec('formatBlock', format)]),
            'occupying',
            [
                ['insertOrderedList'],
                ['insertUnorderedList'],
                ['insertHorizontalRule'],
            ],
            [
                ['removeFormat'],
                ['unlink']
            ],
            [
                ['createLink', 'link', ensureHTTP],
                ['insertImage', 'image', img => img]
            ].map(([cmd, type, t]) => [type, url => (url = prompt(`Enter the ${type} URL`)) && exec(cmd, t(url))]),
            [
                ['undo'],
                ['redo']
            ],
        ];
        const topChildren = [];
        for (const bar of actions) {
            if (bar === 'occupying') {
                if (customButtons.length < 1) {
                    continue;
                }
                const arr = [];
                for (const fn of customButtons) {
                    const b = await fn(field);
                    b && arr.push(b);
                }
                const b = await $('div', {className: 'spell-zone'}, arr);
                topChildren.push(b);
                continue;
            }
            const children = [];
            for (const item of bar) {
                const [cmd, onclick = _ => exec(cmd), control] = item;
                buttons[cmd] = await $('button', {
                    className: 'spell-icon',
                    title: cmd.replace(/([^a-z])/g, ' $1').toLowerCase(),
                    onclick
                }, [await $('i', {className: 'icon-' + cmd.toLowerCase()}), control])
                children.push(buttons[cmd]);
            }
            const ele = await $('div', {className: 'spell-zone'}, children);
            topChildren.push(ele);
        }
        return await $('div', {className: 'spell', spellcheck: true}, [
            await $('div', {className: 'spell-bar'}, topChildren),
            await $('div', {
                className: 'spell-content',
                contentEditable: true,
                onkeydown: event => event.which !== 9,
                onkeyup: queryState,
                onmouseup: queryState
            })
        ])
    }

    return {
        spell, spellRichEditor: {
            addButton: el => customButtons.push(el),
            addStateFn: fn => stateFns.push(fn),
        }
    }
})();
