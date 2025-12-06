;(() => {
    let rendered = false;
    console.log(document.readyState);
    const fn = () => {
        if (rendered) {
            return
        }
        const m = {};
        const as = [...document.querySelectorAll('a[title="copy images"],a[title="copy elements to images"]')]
            .map(el => {
                const div = el.parentElement.querySelector('.gddictname');
                m[div.id + el.title] = el;
                return `<li><a href="#${div.id}" data-id="${div.id + el.title}">${el.title} ${div.querySelector('.gddicttitle').innerText}</a></li>`
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
    document.addEventListener("readystatechange", () => {
        console.log(document.readyState)
        fn();
    });

})();