; (() => {
    let speakText = '', vices = [], engVice, utterance, vice, viceMap = {}, playStat = 0;
    let selectVice = GM_getValue('ttsVice', '自动选择');
    let rate = GM_getValue('ttsrate', 1);
    speechSynthesis.addEventListener("voiceschanged", () => {
        if (vices.length < 1) {
            vices = speechSynthesis.getVoices();
            utterance = new SpeechSynthesisUtterance();
            vices.map(v => viceMap[v.voiceURI] = v);
        }
    });

    const binded = {};

    function play(text, icon, vice = null) {
        utterance.voice = vice ? vice : viceMap[selectVice];
        utterance.text = text;
        utterance.rate = rate;
        playStat = 1;

        if (!binded[utterance.name]) {
            binded[utterance.name] = true;
            utterance.addEventListener('end', () => {
                playStat = 0;
                icon.parentElement.querySelector('button.pp').innerHTML = '▶️';
            })
            utterance.addEventListener('pause', (e) => {
                playStat = 2;
                icon.parentElement.querySelector('button.pp').innerHTML = '▶️';
            })
            utterance.addEventListener('resume', (e) => {
                playStat = 1;
                icon.parentElement.querySelector('button.pp').innerHTML = '⏸️';
            })
        }

        speechSynthesis.speak(utterance);
    }

    function speak(t, icon) {
        if (viceMap[selectVice]) {
            play(t, icon);
            return
        }
        const la = eld.detect(speakText).language;
        console.log(la);
        let vic = false;
        vices.forEach(value => {
            if (vic) {
                return
            }
            const lang = value.lang.toLowerCase()
            if (lang.indexOf(la) > -1) {
                vice = value
                vic = true
            }
            if (!engVice && lang.indexOf('en') > -1) {
                engVice = value
            }
        });
        if (!vice) {
            icon.title = '似乎无可用的tts,请先安装';
            return
        }
        play(t, icon, vice);
    }

    PushIconAction({
        name: 'tts发音 右键设置语速和语言',
        id: 'icon-speech',
        image: GM_getResourceURL('icon-speak'),
        trigger: function (text, _, ev) {
            speakText = text;
            if (vices.length < 1) {
                setTimeout(() => {
                    vices = speechSynthesis.getVoices();
                    if (vices.length > 0) {
                        speak(speakText, ev.target)
                    }
                }, 450);
            } else {
                speak(speakText, ev.target)
            }
        },
        call: (img) => {
            img.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const content = img.parentElement.querySelector('tr-content');
                content.style.display = 'block';
                const arr = vices.map(v => [`${v.lang} - ${v.localService ? 'local' : ''}-${v.name}`, v.voiceURI]);
                arr.unshift(['自动选择', '']);
                const options = buildOption(arr, selectVice, 1, 0);
                content.querySelector('div').innerHTML = `
                <div class="item">
                    <button class="pp">${playStat === 1 ? '⏸️' : '▶️'}</button>
                    <button class="stop">⏹️</button>

                </div>
                <div class="item">
                    <label for="speakspeed">语速:</label>
                    <input id="speakspeed" value="1" min="0" step="0.1" type="number">
                </div>
                <div class="item">
                    <label for="language">语言:</label>
                    <select id="language">${options}</select>
                </div>
                `;
                content.querySelector('.stop').addEventListener('click', () => {
                    speechSynthesis.cancel();
                    playStat = 0;
                    content.querySelector('.pp').innerHTML = '▶️';

                })
                content.querySelector('.pp').addEventListener('click', function (e) {
                    switch (playStat) {
                        case 0:
                            play(window.getSelection().toString().trim(), e.target);
                            this.innerHTML = '⏸️';
                            break;
                        case 1:
                            speechSynthesis.pause();
                            this.innerHTML = '▶️';
                            break;
                        case 2:
                            speechSynthesis.resume();
                            this.innerHTML = '⏸️';
                            break;
                        default:
                            break;
                    }

                })
                content.querySelector('#speakspeed').addEventListener('change', function (e) {
                    rate = this.value;
                    GM_setValue('ttsrate', rate);
                });
                content.querySelector('#language').addEventListener('change', function (e) {
                    selectVice = this.value;
                    GM_setValue('ttsVice', this.value);
                })
            })
        },
        hide: (icon) => {
            speechSynthesis.cancel();
        }
    })
})();


