document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatContainer = document.getElementById('chat-container');
    const messagesWrapper = document.getElementById('messages-wrapper');
    const welcomeScreen = document.getElementById('welcome-screen');
    const newChatBtn = document.getElementById('new-chat-btn');
    const historyList = document.getElementById('history-list');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    
    // Settings elements
    const imageStyleSelect = document.getElementById('image-style-select');
    const aspectRatioSelect = document.getElementById('aspect-ratio-select');
    const imageModelSelect = document.getElementById('image-model-select');
    const stepsSlider = document.getElementById('steps-slider');
    const cfgSlider = document.getElementById('cfg-slider');
    const stepsVal = document.getElementById('steps-val');
    const cfgVal = document.getElementById('cfg-val');
    const themeToggleBtn = document.getElementById('theme-toggle');

    let currentChatId = null;

    // --- History Logic ---
    function saveToHistory(prompt) {
        let history = JSON.parse(localStorage.getItem('chandra_history')) || [];
        const cleanItem = prompt.trim();
        if (!history.includes(cleanItem)) {
            history.unshift(cleanItem);
            if (history.length > 20) history.pop();
            localStorage.setItem('chandra_history', JSON.stringify(history));
            renderHistory();
        }
    }

    function renderHistory() {
        if (!historyList) return;
        const history = JSON.parse(localStorage.getItem('chandra_history')) || [];
        historyList.innerHTML = history.map(item => `
            <li class="history-item" title="${item}">
                <i class="fa-solid fa-image"></i>
                <span class="history-text">${item.length > 20 ? item.substring(0, 20) + '...' : item}</span>
            </li>
        `).join('');

        document.querySelectorAll('.history-item').forEach(li => {
            li.onclick = () => {
                chatInput.value = li.title;
                sendMessage();
            };
        });
    }

    // --- Core Generation Logic (A1111 Optimized) ---
    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        saveToHistory(text);
        if (!currentChatId) currentChatId = Date.now().toString();

        chatInput.value = '';
        chatInput.style.height = 'auto';
        sendBtn.disabled = true;
        welcomeScreen.style.display = 'none';

        appendMessage('user', text);
        const skeletonDiv = appendMessage('bot', '', true);
        
        const settings = loadSettings();
        const cleanPrompt = text.replace(/generate|image|create|make/gi, '').trim();

        // Synthesis Parameters
        let w = 1024, h = 1024;
        if (settings.aspectRatio === '16:9') { w = 1280; h = 720; }
        else if (settings.aspectRatio === '9:16') { w = 720; h = 1280; }
        else if (settings.aspectRatio === '21:9') { w = 1440; h = 612; }

        // Prompt Engineering (A1111 / Stable Diffusion style)
        let finalPrompt = cleanPrompt;
        if (settings.model === 'stable-diffusion-xl') {
            finalPrompt = `${cleanPrompt}, masterpiece, highly detailed, sharp focus, 8k resolution, cinematic lighting, ultra-realistic textures`;
        }

        if (settings.imageStyle === 'anime') finalPrompt += `, vibrant anime style, colorful, digital illustration`;
        else if (settings.imageStyle === 'cinematic') finalPrompt += `, cinematic 3D render, unreal engine 5, octane render`;
        else if (settings.imageStyle === 'artistic') finalPrompt += `, expressive oil painting, fine art style`;

        let retries = 0;
        const maxRetries = 2;

        const attemptSynthesis = () => {
            const seed = Math.floor(Math.random() * 1000000);
            // Enhanced URL with A1111 parameters
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=${w}&height=${h}&seed=${seed}&nologo=true&model=${settings.model}&steps=${settings.steps}&cfg=${settings.cfg}`;
            
            const img = new Image();
            img.crossOrigin = "anonymous";
            
            const timeout = setTimeout(() => {
                img.src = "";
                handleFailure();
            }, 45000); 

            img.onload = () => {
                clearTimeout(timeout);
                if (skeletonDiv && skeletonDiv.parentNode) skeletonDiv.remove();
                const replyText = `**Prompt:** ${cleanPrompt}\n**Engine:** Stable Diffusion (Steps: ${settings.steps} | CFG: ${settings.cfg})`;
                appendMessage('bot', replyText, false, new Date(), imageUrl);
                showToast("Synthesis ready!");
                sendBtn.removeAttribute('disabled');
            };

            img.onerror = () => {
                clearTimeout(timeout);
                handleFailure();
            };

            img.src = imageUrl;
        };

        const handleFailure = () => {
            if (retries < maxRetries) {
                retries++;
                attemptSynthesis();
            } else {
                if (skeletonDiv && skeletonDiv.parentNode) skeletonDiv.remove();
                appendMessage('bot', "The synthesis engine is overloaded. Please try lower Sampling Steps or CFG Scale.");
                sendBtn.removeAttribute('disabled');
            }
        };

        attemptSynthesis();
    }

    // --- UI Helpers ---
    function appendMessage(sender, text, isSkeleton = false, date = new Date(), fileUrl = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        const avatarContent = sender === 'user' ? 'U' : '<i class="fa-solid fa-wand-magic-sparkles"></i>';
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        let mediaContent = '';
        if (fileUrl) {
            mediaContent = `
                <div class="message-media" style="margin-top: 10px;">
                    <img src="${fileUrl}" alt="AI Image" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); display: block;" crossOrigin="anonymous">
                    <div style="display:flex; gap:10px; margin-top:12px;">
                        <button onclick="downloadFromDOM(this)" class="msg-action-btn" style="background: var(--chandra-gradient); color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="fa-solid fa-download"></i> Download 4K Image
                        </button>
                    </div>
                </div>`;
        }

        messageDiv.innerHTML = `
            <div class="msg-avatar ${sender}">${avatarContent}</div>
            <div class="msg-body">
                <div class="message-header">
                    <span class="msg-sender">${sender === 'user' ? 'User' : 'ChandraXImage'}</span>
                    <span class="message-time">${timeStr}</span>
                </div>
                <div class="msg-text">
                    ${isSkeleton ? '<div class="skeleton-line medium"></div><div class="skeleton-line"></div>' : marked.parse(text)}
                </div>
                ${mediaContent}
            </div>
        `;
        messagesWrapper.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        return messageDiv;
    }

    window.downloadFromDOM = (btn) => {
        try {
            const mediaDiv = btn.closest('.message-media');
            const img = mediaDiv.querySelector('img');
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `StableDiffusion-${Date.now()}.png`;
                link.click();
            }, 'image/png');
        } catch (e) {
            showToast("Download failed", "error");
        }
    };

    function showToast(msg, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerText = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    function loadSettings() {
        return { 
            imageStyle: imageStyleSelect.value,
            aspectRatio: aspectRatioSelect.value,
            model: imageModelSelect.value,
            steps: stepsSlider.value,
            cfg: cfgSlider.value
        };
    }

    // --- Listeners ---
    stepsSlider.oninput = () => { stepsVal.innerText = stepsSlider.value; };
    cfgSlider.oninput = () => { cfgVal.innerText = cfgSlider.value; };

    [imageStyleSelect, aspectRatioSelect, imageModelSelect, stepsSlider, cfgSlider].forEach(el => {
        el.onchange = () => localStorage.setItem('chandra_settings', JSON.stringify(loadSettings()));
    });

    themeToggleBtn.onclick = () => document.body.classList.toggle('light-mode');
    mobileMenuBtn.onclick = () => sidebar.classList.toggle('open');
    newChatBtn.onclick = () => { messagesWrapper.innerHTML = ''; welcomeScreen.style.display = 'flex'; };
    
    chatInput.oninput = function() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
        sendBtn.disabled = !this.value.trim();
    };
    
    chatInput.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
    sendBtn.onclick = sendMessage;
    renderHistory();

    document.querySelectorAll('.suggestion-card').forEach(card => {
        card.onclick = () => {
            chatInput.value = card.querySelector('p').innerText;
            sendMessage();
        };
    });
});
