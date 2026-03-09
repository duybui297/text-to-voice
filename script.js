document.addEventListener('DOMContentLoaded', () => {
    const synth = window.speechSynthesis;

    const textInput = document.getElementById('text-input');
    const voiceSelect = document.getElementById('voice-select');
    const rateSlider = document.getElementById('rate');
    const rateValue = document.getElementById('rate-value');
    const pitchSlider = document.getElementById('pitch');
    const pitchValue = document.getElementById('pitch-value');
    const playBtn = document.getElementById('play-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const stopBtn = document.getElementById('stop-btn');
    const downloadBtn = document.getElementById('download-btn');
    const statusText = document.getElementById('status-text');
    const pulse = document.querySelector('.pulse');

    let voices = [];

    // Default text in Vietnamese if user is Vietnamese (based on prompt)
    textInput.value = "Xin chào! Đây là ứng dụng chuyển đổi văn bản thành giọng nói. Bạn có thể gõ bất kỳ nội dung nào vào đây để nghe.";

    function populateVoiceList() {
        voices = synth.getVoices();
        const selectedIndex = voiceSelect.selectedIndex < 0 ? 0 : voiceSelect.selectedIndex;
        voiceSelect.innerHTML = '';

        // Sort voices to put some good ones first, e.g. Vietnamese if available, then English
        const sortedVoices = [...voices].sort((a, b) => {
            if (a.lang.includes('vi') && !b.lang.includes('vi')) return -1;
            if (!a.lang.includes('vi') && b.lang.includes('vi')) return 1;
            if (a.lang.includes('en') && !b.lang.includes('en')) return -1;
            if (!a.lang.includes('en') && b.lang.includes('en')) return 1;
            return a.name.localeCompare(b.name);
        });

        sortedVoices.forEach((voice, i) => {
            const option = document.createElement('option');
            option.textContent = `${voice.name} (${voice.lang})`;

            if (voice.default) {
                option.textContent += ' — Default';
            }

            option.setAttribute('data-lang', voice.lang);
            option.setAttribute('data-name', voice.name);
            voiceSelect.appendChild(option);
        });

        voiceSelect.selectedIndex = selectedIndex !== -1 ? selectedIndex : 0;
    }

    populateVoiceList();
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoiceList;
    }

    // Update Slider Values
    rateSlider.addEventListener('input', () => {
        rateValue.textContent = rateSlider.value;
    });

    pitchSlider.addEventListener('input', () => {
        pitchValue.textContent = pitchSlider.value;
    });

    function updateUIState(state) {
        if (state === 'playing') {
            pulse.className = 'pulse playing';
            statusText.textContent = 'Speaking...';
            statusText.style.color = 'var(--success-color)';
            playBtn.disabled = true;
            pauseBtn.disabled = false;
            stopBtn.disabled = false;

            // Adjust pause button text
            pauseBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> Pause`;
        } else if (state === 'paused') {
            pulse.className = 'pulse paused';
            statusText.textContent = 'Paused';
            statusText.style.color = '#f59e0b';
            playBtn.disabled = true;
            pauseBtn.disabled = false;
            stopBtn.disabled = false;

            // Change pause button to resume
            pauseBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Resume`;
        } else {
            pulse.className = 'pulse';
            statusText.textContent = 'Ready';
            statusText.style.color = 'var(--text-secondary)';
            playBtn.disabled = false;
            pauseBtn.disabled = true;
            stopBtn.disabled = true;

            pauseBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> Pause`;
        }
    }

    function speak() {
        if (synth.speaking) {
            console.error('speechSynthesis.speaking');
            return;
        }

        if (textInput.value !== '') {
            const utterThis = new SpeechSynthesisUtterance(textInput.value);

            utterThis.onend = function (event) {
                updateUIState('stopped');
            };

            utterThis.onerror = function (event) {
                console.error('SpeechSynthesisUtterance.onerror');
                updateUIState('stopped');
            };

            const selectedOption = voiceSelect.selectedOptions[0].getAttribute('data-name');

            for (let i = 0; i < voices.length; i++) {
                if (voices[i].name === selectedOption) {
                    utterThis.voice = voices[i];
                    break;
                }
            }

            utterThis.pitch = pitchSlider.value;
            utterThis.rate = rateSlider.value;

            synth.speak(utterThis);
            updateUIState('playing');
        }
    }

    playBtn.addEventListener('click', (event) => {
        event.preventDefault();
        if (synth.paused) {
            synth.resume();
            updateUIState('playing');
        } else {
            speak();
        }
    });

    pauseBtn.addEventListener('click', (event) => {
        event.preventDefault();
        if (synth.speaking && !synth.paused) {
            synth.pause();
            updateUIState('paused');
        } else if (synth.paused) {
            synth.resume();
            updateUIState('playing');
        }
    });

    stopBtn.addEventListener('click', (event) => {
        event.preventDefault();
        if (synth.speaking) {
            synth.cancel();
            updateUIState('stopped');
        }
    });

    // Handle Download Audio (Workaround using generic external TTS API)
    downloadBtn.addEventListener('click', (event) => {
        event.preventDefault();
        const text = textInput.value.trim();
        if (!text) {
            alert("Vui lòng nhập văn bản để tải xuống!");
            return;
        }

        // Using a free Google Translate TTS endpoint as a workaround for downloading
        // Note: Web Speech API (speechSynthesis) does not support extracting audio streams directly.
        const selectedOption = voiceSelect.selectedOptions[0];
        let lang = selectedOption ? selectedOption.getAttribute('data-lang') : 'vi';

        // Ensure language code is formatted for the API (e.g., 'vi-VN' -> 'vi')
        lang = lang.split('-')[0];

        // The free endpoint has a character limit, usually around 200 chars.
        if (text.length > 200) {
            alert("Lưu ý: Tính năng tải xuống sử dụng API miễn phí nên có giới hạn khoảng 200 ký tự. Văn bản dài hơn có thể bị cắt bớt.");
        }

        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text.slice(0, 200))}&tl=${lang}&client=tw-ob`;

        // Open the audio in a new tab where user can right click -> save as, or download directly.
        window.open(url, '_blank');
    });

    window.addEventListener('beforeunload', () => {
        synth.cancel();
    });
});
