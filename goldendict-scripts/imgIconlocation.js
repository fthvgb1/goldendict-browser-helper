;(() => {
    let rendered = false;
    const fn = () => {
        if (rendered) {
            return
        }
        const m = {};
        const as = [...document.querySelectorAll('a[title="copy images"],a[title="copy elements to images"]')]
            .map(el => {
                const div = el.previousElementSibling.previousElementSibling;
                m[div.id] = el;
                return `<li><a href="#${div.id}" data-id="${div.id}">${div.querySelector('.gddicttitle').innerText}</a></li>`
            });
        if (as.length < 1) {
            return;
        }
        const html = document.createElement('div');
        html.innerHTML = `<ol style="position: fixed; right: 0; top: 0;  list-style: none">${as.join('')}</ol>`;
        [...html.querySelectorAll('a')].forEach(a => {
            a.addEventListener('contextmenu', e => {
                e.preventDefault();
                m[a.dataset.id].click();
            });
        })
        document.body.insertAdjacentElement('beforeend', html.children[0]);
        rendered = true;
    };
    if (document.readyState === 'complete') {
        fn();
        return
    }
    console.log(document.readyState)
    document.addEventListener("readystatechange", () => {
        console.log(document.readyState)
        fn();
    });

})();