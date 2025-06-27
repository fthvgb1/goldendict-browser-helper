(async function () {
    let customizeResource;

    async function loadConf() {
        const article = document.querySelector('script[src$="article-script.js"]');
        if (!article) {
            return
        }
        const confSrc = article.src.replace('article-script.js', 'config.json');
        let conf;
        const r = await fetch(confSrc).then(r => r.text());
        conf = JSON.parse(r);
        customizeResource = conf.hasOwnProperty('customizeResource') ? conf.customizeResource : {};
        window.dictImageMap = conf.hasOwnProperty('dictImageMap') ? conf.dictImageMap : {};
        const generalResource = conf.hasOwnProperty('generalResource') ? conf.generalResource : [];
        if (generalResource.length > 0) {
            generalResource.forEach(filename => {
                const suf = filename.split('.');
                const el = createResource[suf[suf.length - 1]](article.src.replace('article-script.js', filename));
                load(el, article, false);
            });
        }
        loadCustomizeResource();
    }

    function load(resource, ele, before = true) {
        ele.insertAdjacentElement(before ? 'beforebegin' : 'afterend', resource);
    }

    const createResource = {
        css(link) {
            const c = document.createElement('link');
            c.type = 'text/css';
            c.rel = 'stylesheet';
            c.href = link;
            return c

        },
        js(src) {
            const j = document.createElement('script');
            j.src = src
            //j.async = false;
            return j
        }
    }

    function loadCustomizeResource() {
        function loadx(resource, div, name) {
            const suf = resource.split('.');
            const el = createResource[suf[suf.length - 1]](`bres://${name}/${resource}`);
            load(el, div);
        }

        document.querySelectorAll('.gddicttitle').forEach(el => {
            if (!customizeResource.hasOwnProperty(el.innerText)) {
                return
            }
            const m = el.parentElement.parentElement.querySelector('.mdict');
            if (!m) {
                return;
            }
            const resource = customizeResource[el.innerText];
            const div = m.querySelector('*:not(link,script)');
            const name = el.parentElement.id.split('-')[1];

            if (typeof resource === 'string') {
                loadx(resource, div, name);
            }
            if (Array.isArray(resource)) {
                resource.forEach(r => loadx(r, div, name));
            }
        })
    }


    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", loadConf);
    } else {
        await loadConf()
    }

})()

