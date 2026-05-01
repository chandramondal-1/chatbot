document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatContainer = document.getElementById('chat-container');
    const messagesWrapper = document.getElementById('messages-wrapper');
    const welcomeScreen = document.getElementById('welcome-screen');
    const newChatBtn = document.getElementById('new-chat-btn');
    const historyList = document.getElementById('history-list');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    
    // Modal Elements
    const settingsModal = document.getElementById('settings-modal');
    const openSettingsBtn = document.getElementById('open-settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');

    const settingsEls = {
        imageStyle: document.getElementById('image-style-select'),
        aspectRatio: document.getElementById('aspect-ratio-select'),
        connectionMode: document.getElementById('connection-mode'),
        apiUrl: document.getElementById('api-url'),
        quality: document.getElementById('quality-select'),
        steps: document.getElementById('steps-slider'),
        cfg: document.getElementById('cfg-slider'),
        stepsVal: document.getElementById('steps-val'),
        cfgVal: document.getElementById('cfg-val')
    };
    
    const themeToggleBtn = document.getElementById('theme-toggle');
    const attachBtn = document.getElementById('attach-btn');
    const fileInput = document.getElementById('file-input');
    const attachmentPreview = document.getElementById('attachment-preview');

    let attachments = [];

    // --- Initialization ---
    function init() {
        if (localStorage.getItem('chandra_theme') === 'light') {
            document.body.classList.add('light-mode');
            themeToggleBtn.querySelector('i').className = 'fa-regular fa-moon';
        }

        const savedSettings = JSON.parse(localStorage.getItem('chandra_settings')) || {};
        Object.keys(settingsEls).forEach(key => {
            if (savedSettings[key] && settingsEls[key]) {
                settingsEls[key].value = savedSettings[key];
            }
        });
        updateSliderLabels();
        toggleLocalSettings();
        renderHistory();
    }

    // --- Modal Control ---
    openSettingsBtn.onclick = () => settingsModal.style.display = 'flex';
    closeSettingsBtn.onclick = () => settingsModal.style.display = 'none';
    saveSettingsBtn.onclick = () => {
        localStorage.setItem('chandra_settings', JSON.stringify(loadSettings()));
        settingsModal.style.display = 'none';
        showToast("EvoLink Config Updated", "success");
    };
    window.onclick = (e) => { if (e.target === settingsModal) settingsModal.style.display = 'none'; };

    function updateSliderLabels() {
        if (settingsEls.stepsVal) settingsEls.stepsVal.innerText = settingsEls.steps.value;
        if (settingsEls.cfgVal) settingsEls.cfgVal.innerText = settingsEls.cfg.value;
    }

    function toggleLocalSettings() {
        const localArea = document.getElementById('local-settings');
        if (localArea) localArea.style.display = (settingsEls.connectionMode && settingsEls.connectionMode.value === 'cloud') ? 'none' : 'block';
    }

    function scrollBottom() {
        setTimeout(() => {
            chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
        }, 100);
    }

    // --- Attachment Logic ---
    attachBtn.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            if (attachments.length >= 5) return showToast("Max 5 files", "error");
            const reader = new FileReader();
            reader.onload = (re) => {
                attachments.push({
                    name: file.name,
                    size: (file.size / 1024).toFixed(1) + " KB",
                    type: file.type,
                    data: re.target.result,
                    id: Date.now() + Math.random()
                });
                renderAttachmentPreviews();
                sendBtn.disabled = false;
            };
            if (file.type.startsWith('image/')) reader.readAsDataURL(file);
            else reader.readAsText(file.slice(0, 100));
        });
        fileInput.value = '';
    };

    function renderAttachmentPreviews() {
        attachmentPreview.innerHTML = attachments.map(att => `
            <div class="preview-pill">
                ${att.type.startsWith('image/') ? `<img src="${att.data}">` : `<i class="fa-solid fa-file"></i>`}
                <span>${att.name.length > 10 ? att.name.substring(0, 10) + '...' : att.name}</span>
                <i class="fa-solid fa-xmark" onclick="removeAttachment(${att.id})"></i>
            </div>
        `).join('');
    }

    window.removeAttachment = (id) => {
        attachments = attachments.filter(att => att.id !== id);
        renderAttachmentPreviews();
        if (attachments.length === 0 && !chatInput.value.trim()) sendBtn.disabled = true;
    };

    // --- History Logic ---
    function saveToHistory(prompt) {
        if (!prompt || prompt.trim() === '') return;
        let history = JSON.parse(localStorage.getItem('chandra_history')) || [];
        if (!history.includes(prompt.trim())) {
            history.unshift(prompt.trim());
            if (history.length > 20) history.pop();
            localStorage.setItem('chandra_history', JSON.stringify(history));
            renderHistory();
        }
    }

    function renderHistory() {
        if (!historyList) return;
        const history = JSON.parse(localStorage.getItem('chandra_history')) || [];
        historyList.innerHTML = history.map((item, index) => `
            <li class="history-item" data-prompt="${encodeURIComponent(item)}">
                <div class="history-content">
                    <i class="fa-solid fa-image"></i>
                    <span class="history-text">${item}</span>
                </div>
                <button class="history-delete" data-index="${index}"><i class="fa-solid fa-trash-can"></i></button>
            </li>
        `).join('');

        document.querySelectorAll('.history-content').forEach(el => {
            el.onclick = () => {
                const prompt = decodeURIComponent(el.closest('.history-item').dataset.prompt);
                loadHistoryItem(prompt);
            };
        });

        document.querySelectorAll('.history-delete').forEach(el => {
            el.onclick = (e) => {
                e.stopPropagation();
                deleteHistoryItem(parseInt(el.dataset.index));
            };
        });
    }

    function loadHistoryItem(prompt) {
        messagesWrapper.innerHTML = '';
        welcomeScreen.style.display = 'none';
        chatInput.value = prompt;
        if (window.innerWidth <= 768) { 
            sidebar.classList.remove('open'); 
            if (sidebarOverlay) sidebarOverlay.style.display = 'none'; 
        }
        sendMessage();
    }

    function deleteHistoryItem(index) {
        let history = JSON.parse(localStorage.getItem('chandra_history')) || [];
        history.splice(index, 1);
        localStorage.setItem('chandra_history', JSON.stringify(history));
        renderHistory();
    }

    // --- EvoLink AI Core ---
    async function sendMessage() {
        const text = chatInput.value.trim();
        const currentAttachments = [...attachments];
        if (!text && currentAttachments.length === 0) return;

        saveToHistory(text);
        chatInput.value = ''; 
        chatInput.style.height = 'auto'; 
        sendBtn.disabled = true;
        welcomeScreen.style.display = 'none'; 
        attachments = []; 
        renderAttachmentPreviews();

        appendMessage('user', text, false, new Date(), null, currentAttachments);
        const botMsgDiv = appendMessage('bot', '', true); // Skeleton
        scrollBottom();
        
        try {
            // STEP 1: EvoLink Prompt Expansion (Text AI)
            const expansionSystemPrompt = "You are the EvoLink AI Master Prompt Engineer. Expand the user's short description into a highly technical, professional Stable Diffusion prompt. Include lighting, composition, camera gear, and 32K resolution keywords. Return ONLY the expanded prompt string.";
            
            const textResponse = await fetch('https://text.pollinations.ai/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: expansionSystemPrompt },
                        { role: 'user', content: text }
                    ],
                    model: 'gpt-4o'
                })
            });
            
            if (!textResponse.ok) throw new Error("EvoLink Expansion Hub Busy");
            let expandedPrompt = await textResponse.text();
            expandedPrompt = expandedPrompt.trim() || text;

            // STEP 2: Synthesis (Image AI)
            const settings = loadSettings();
            const qFactor = parseFloat(settings.quality || 4);
            let w = 512 * qFactor, h = 512 * qFactor;
            if (settings.aspectRatio === '16:9') { w = 1280 * (qFactor/4); h = 720 * (qFactor/4); }
            else if (settings.aspectRatio === '9:16') { w = 720 * (qFactor/4); h = 1280 * (qFactor/4); }
            
            const MAX_RES = 2048;
            if (w > MAX_RES || h > MAX_RES) { const r = Math.min(MAX_RES/w, MAX_RES/h); w=Math.floor(w*r); h=Math.floor(h*r); }

            if (settings.connectionMode === 'cloud') {
                await performCloudSynthesis(expandedPrompt, Math.floor(w), Math.floor(h), settings, botMsgDiv);
            } else {
                await performA1111Synthesis(expandedPrompt, Math.floor(w), Math.floor(h), settings, botMsgDiv);
            }
        } catch (error) {
            updateBotMessage(botMsgDiv, `EvoLink Engine Error: ${error.message}`);
            sendBtn.disabled = false;
        }
    }

    async function performCloudSynthesis(prompt, w, h, settings, botMsgDiv) {
        const seed = Math.floor(Math.random() * 1000000);
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&seed=${seed}&nologo=true&model=flux`;
        
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            updateBotMessage(botMsgDiv, `**EvoLink 32K Synthesis Success**\n\n**Expanded Prompt:** ${prompt}`, url);
            sendBtn.disabled = false;
        };
        img.onerror = () => {
            console.warn("Primary synthesis engine timeout. Switching to Turbo...");
            const turboUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&seed=${seed}&nologo=true&model=turbo`;
            const turboImg = new Image();
            turboImg.onload = () => {
                updateBotMessage(botMsgDiv, `**EvoLink Turbo Fallback Success**\n\n**Expanded Prompt:** ${prompt}`, turboUrl);
                sendBtn.disabled = false;
            };
            turboImg.onerror = () => {
                updateBotMessage(botMsgDiv, "Synthesis failed. The EvoLink engine is under extreme load. Please try again in a few seconds.");
                sendBtn.disabled = false;
            }
            turboImg.src = turboUrl;
        };
        img.src = url;
    }

    async function performA1111Synthesis(prompt, w, h, settings, botMsgDiv) {
        const url = settings.apiUrl || "http://127.0.0.1:7860";
        try {
            const res = await fetch(`${url}/sdapi/v1/txt2img`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, steps: parseInt(settings.steps), cfg_scale: parseFloat(settings.cfg), width: w, height: h })
            });
            if (!res.ok) throw new Error("A1111 Node Offline");
            const data = await res.json();
            updateBotMessage(botMsgDiv, `**EvoLink Local Synthesis Success**`, `data:image/png;base64,${data.images[0]}`);
            sendBtn.disabled = false;
        } catch(e) {
            updateBotMessage(botMsgDiv, "Local A1111 connection failed. Ensure --cors-allow-origin=* is enabled.");
            sendBtn.disabled = false;
        }
    }

    function appendMessage(sender, text, isSkeleton = false, date = new Date(), fileUrl = null, currentAttachments = []) {
        const div = document.createElement('div'); div.className = `message ${sender}`;
        const avatar = sender === 'user' ? 'U' : '<i class="fa-solid fa-wand-magic-sparkles"></i>';
        const safeText = text || "";
        const htmlContent = isSkeleton ? '<div class="skeleton-line"></div><div class="skeleton-line"></div>' : (typeof marked !== 'undefined' ? marked.parse(safeText) : safeText);

        div.innerHTML = `
            <div class="msg-avatar ${sender}">${avatar}</div>
            <div class="msg-body">
                <div class="message-header">
                    <span class="msg-sender">${sender==='user'?'User':'EvoLink AI'}</span>
                    <span class="message-time">${date.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                </div>
                <div class="msg-text">${htmlContent}</div>
            </div>
        `;
        messagesWrapper.appendChild(div); scrollBottom(); return div;
    }

    function updateBotMessage(div, text, fileUrl = null) {
        const msgBody = div.querySelector('.msg-text');
        if (!msgBody) return;
        msgBody.innerHTML = typeof marked !== 'undefined' ? marked.parse(text) : text;
        
        if (fileUrl) {
            // Remove existing media if any
            const existingMedia = div.querySelector('.message-media');
            if (existingMedia) existingMedia.remove();

            const media = document.createElement('div'); media.className = 'message-media'; media.style.marginTop = '15px';
            media.innerHTML = `
                <img src="${fileUrl}" style="max-width:100%; border-radius:12px; box-shadow:var(--shadow-lg);">
                <br>
                <button onclick="downloadFromDOM(this)" class="send-btn" style="width:auto; padding:0 20px; margin-top:10px; font-size:0.8rem;">
                    <i class="fa-solid fa-download"></i> Download
                </button>`;
            div.querySelector('.msg-body').appendChild(media);
        }
        scrollBottom();
    }

    window.downloadFromDOM = (btn) => {
        const img = btn.parentNode.querySelector('img');
        if (!img) return;
        const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        canvas.toBlob(blob => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `EvoLink-${Date.now()}.png`; a.click(); });
    };

    function showToast(msg, type = 'success') {
        const container = document.getElementById('toast-container'); if (!container) return;
        const t = document.createElement('div'); t.className = `toast ${type}`; t.innerText = msg;
        container.appendChild(t); setTimeout(() => t.remove(), 3000);
    }

    function loadSettings() {
        const s = {};
        Object.keys(settingsEls).forEach(k => { if (settingsEls[k]) s[k] = settingsEls[k].value; });
        return s;
    }

    // --- Listeners ---
    Object.values(settingsEls).forEach(el => { if (el) el.onchange = () => { updateSliderLabels(); toggleLocalSettings(); }; });
    if (settingsEls.steps) settingsEls.steps.oninput = updateSliderLabels;
    if (settingsEls.cfg) settingsEls.cfg.oninput = updateSliderLabels;

    themeToggleBtn.onclick = () => {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        localStorage.setItem('chandra_theme', isLight ? 'light' : 'dark');
        themeToggleBtn.querySelector('i').className = isLight ? 'fa-regular fa-moon' : 'fa-regular fa-sun';
    };

    mobileMenuBtn.onclick = () => { sidebar.classList.toggle('open'); if (sidebarOverlay) sidebarOverlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none'; };
    if (sidebarOverlay) sidebarOverlay.onclick = () => { sidebar.classList.remove('open'); sidebarOverlay.style.display = 'none'; };
    newChatBtn.onclick = () => { messagesWrapper.innerHTML = ''; welcomeScreen.style.display = 'flex'; };
    chatInput.oninput = function() { this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px'; sendBtn.disabled = !this.value.trim() && attachments.length === 0; };
    chatInput.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
    sendBtn.onclick = sendMessage;

    init();
});
