;(() => {
    let speakText = '', vices = [], engVice, utterance, vice;

    speechSynthesis.addEventListener("voiceschanged", () => {
        if (vices.length < 1) {
            vices = speechSynthesis.getVoices();
            utterance = new SpeechSynthesisUtterance();
        }
    });

    function speak(t, icon) {
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
        utterance.voice = vice;
        utterance.text = t;
        speechSynthesis.speak(utterance);
    }

    PushIconAction({
        name: 'tts发音',
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
        hide: (icon) => {
            speechSynthesis.cancel();
        }
    })
})();


