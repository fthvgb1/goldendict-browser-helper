;(() => {
    if (window.self !== window.top) {
        return;
    }
    const menus = [...GM_getValue('menus', []), ...[
        {
            title: "anki",
            action: addAnki,
            key: "p"
        },
        {
            title: 'qrcode',
            action() {
                const html = document.createElement('div');
                html.innerHTML = createHtml(`
                        <style>
                            .qr-text{ width: 26vw; margin-bottom: 1vw; height: 2vw; font-size: 100%; }
                            .qr-img img{ margin: auto; max-width: 27vw }
                        </style>
                        
                        <div class="qr-container">
                            <input type="text" name="qr-text" class="qr-text" value="${location.href}">
                            <div class="qr-img"></div>
                        </div>`);
                const qr = new QRCode(html.querySelector('.qr-img'), {
                    text: location.href,
                    correctLevel: QRCode.CorrectLevel.L,
                    height: 365,
                    width: 365,
                });
                html.querySelector('.qr-text').addEventListener('change', function () {
                    this.value && qr.makeCode(this.value);
                });
                Swal.fire({
                    title: "<h3>qrcode</h3>",
                    html: html,
                    width: '32vw',
                });
            },
            key: 'm'
        },
        {
            title: "PDFJS",
            async action() {
                const helperServerHost = GM_getValue('host', 'http://127.0.0.1:9999');
                if (location.href.startsWith('file:///')) {
                    const path = location.href.replace('file:///', '');
                    const file = `${helperServerHost}/file?file=${path}`;
                    location.href = `${helperServerHost}/pdfjs/viewer.html?file=${file}`
                    return
                }
                location.href = `${helperServerHost}/pdfjs/viewer.html`;
            },
            key: "v"
        },
        ...(() => {
            let menus = customizeMenu(location.href);
            navigation.addEventListener("navigate", e => {
                const newMenu = customizeMenu(e.destination.url);
                arrayDiff(newMenu, menus, (a, b) => a.title === b.title).forEach(menu => window.userJSMenu[menu.title] = GM_registerMenuCommand(menu.title, menu.action));
                arrayDiff(menus, newMenu, (a, b) => a.title === b.title).forEach(v => GM_unregisterMenuCommand(window.userJSMenu[v.title]));
                menus = newMenu;
            });
            return menus
        })(),
        /*{
            title: "sh",
            action: {
                cmd: "ls -l /var/log/!*.log",
            },
            key: "e",
            path: "cmd",
            call: (res) => {
                console.log(res.response)
            },
        }*/
        /*{
            title: "env",
            action: {
                cmd: ["env","grep","wc"],
                args: [],
                "1": ["PATH"],
                "2": ["-l"],
                env: ["PATH=$PATH:/home/xing"]
            },
            key: "e",
            path: "cmd",
            call: (res) => {
                console.log(res.response)
            },
        }*/
        /*{
            title: "ls",
            action: {cmd: "ls", args: ["-l", "/"]},
            key: "e",
            path: "cmd",
            call: (res) => {
                console.log(res.response)
            },
        }*/
    ]];

    function customizeMenu(url) {
        return GM_getValue('fetch-items', []).filterAndMapX(fetchItem => {
            const name = fetchItem['fetch-name'];
            if (!name || !fetchItem['fetch-active']) {
                return false;
            }
            let active = false;
            if (fetchItem['url-scope']) {
                for (const scope of fetchItem['url-scope'].split('||')) {
                    if (new RegExp(scope).test(url)) {
                        active = true;
                        break;
                    }
                }
                if (!active) {
                    return false;
                }
            }
            if (!fetchItem['add-contextmenu']) {
                active && superFetchHook.executeActions(name);
                return false
            }
            return {title: name, action: () => superFetchHook.executeActions(name)};
        });
    }

    PushContextMenu(...menus);
})();