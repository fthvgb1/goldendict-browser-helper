(async function () {
    const Loader = '___customize-resourceLoader';
    if (window.hasOwnProperty(Loader)) {
        return
    }
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
                if (!filename) {
                    return
                }
                const suf = getSuffix(filename);
                if (!suffixes.has(suf)) {
                    return;
                }
                const el = createResource[suf](article.src.replace('article-script.js', filename));
                load(el, article, false);
            });
        }
        loadCustomizeResource();
        window[Loader] = true;
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

    function getSuffix(name) {
        const suf = name.split('.');
        return suf[suf.length - 1];
    }

    const suffixes = new Set(['css', 'js']);

    function loadCustomizeResource() {
        function loadx(resource, div, name) {
            const suf = getSuffix(resource);
            if (!suffixes.has(suf)) {
                return
            }
            const el = createResource[suf](`bres://${name}/${resource}`);
            load(el, div);
        }

        document.querySelectorAll('.gddicttitle').forEach(el => {
            const m = el.parentElement.parentElement.querySelector('.mdict');
            if (!m) {
                return;
            }
            if (!m.hasAttribute('dictname')) {
                m.setAttribute('dictname', el.innerText);
            }
            if (!customizeResource.hasOwnProperty(el.innerText) || !m) {
                return
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

