(function () {
    PushHookAnkiStyle(`.anki-thumb-img { width:100px !important;height:100px !important;}`)
    const callback = (mutationList, observer) => {
        for (const mutation of mutationList) {
            if (!mutation.target.matches('div.spell-content') || !findParent(mutation.target, 'div.spell-content') || mutation.addedNodes.length < 1) {
                continue;
            }
            for (const node of mutation.addedNodes) {
                const imgs = [];
                node.tagName === 'IMG' ? imgs.push(node) : imgs.push(...node.querySelectorAll('img'));
                imgs.forEach(img => {
                    if (img.width * img.height < 10000) {
                        return
                    }
                    !img.classList.contains('anki-thumb-img') && img.classList.add('anki-thumb-img');
                    img.addEventListener('dblclick', () => {
                        img.classList.contains('anki-thumb-img') ? img.classList.remove('anki-thumb-img') : img.classList.add('anki-thumb-img');
                    });
                });
            }
        }
    };
    const observer = new MutationObserver(callback);


    PushAnkiBeforeSaveHook((isUpdate, note) => {
        Object.keys(note.fields).forEach(field => {
            const div = document.createElement('div');
            div.innerHTML = note.fields[field];
            const imgs = div.querySelectorAll('img.anki-thumb-img');
            if (imgs.length < 1) {
                return
            }
            imgs.forEach(img => img.classList.remove('anki-thumb-img'));
            note.fields[field] = div.innerHTML;
        });
    });

    PushHookAnkiHtml(function (html) {
        const config = {childList: true, subtree: true};
        observer.observe(html, config);

    });

    PushHookAnkiClose(() => {
        observer.disconnect();
    })
})();