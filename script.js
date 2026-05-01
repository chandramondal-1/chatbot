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
        imageModel: document.getElementById('image-model-select'),
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

    let currentChatId = null;
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
        showToast("Settings Saved", "success");
    };
    window.onclick = (e) => { if (e.target === settingsModal) settingsModal.style.display = 'none'; };

    function updateSliderLabels() {
        if (settingsEls.stepsVal) settingsEls.stepsVal.innerText = settingsEls.steps.value;
        if (settingsEls.cfgVal) settingsEls.cfgVal.innerText = settingsEls.cfg.value;
    }

    function toggleLocalSettings() {
        const localArea = document.getElementById('local-settings');
        if (localArea) localArea.style.display = settingsEls.connectionMode.value === 'cloud' ? 'none' : 'block';
    }

    function scrollBottom() {
        chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
    }

    // --- Attachment Logic ---
    attachBtn.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            if (attachments.length >= 5) return showToast("Max 5 files allowed", "error");
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
            if (file.type.startsWith('image/') || file.type.startsWith('audio/') || file.type.startsWith('video/')) reader.readAsDataURL(file);
            else reader.readAsText(file.slice(0, 100));
        });
        fileInput.value = '';
    };

    function renderAttachmentPreviews() {
        attachmentPreview.innerHTML = attachments.map(att => `
            <div class="preview-pill">
                ${att.type.startsWith('image/') ? `
                    <img src="${att.data}">
                    <i class="fa-solid fa-wand-sparkles interrogate-btn" title="Interrogate (EvoLink AI)" onclick="interrogateImage(${att.id})"></i>
                ` : `<i class="fa-solid fa-file"></i>`}
                <span title="${att.name}">${att.name.length > 10 ? att.name.substring(0, 10) + '...' : att.name}</span>
                <i class="fa-solid fa-xmark remove-attachment" onclick="removeAttachment(${att.id})"></i>
            </div>
        `).join('');
    }

    window.interrogateImage = async (id) => {
        const att = attachments.find(a => a.id === id);
        if (!att || !att.data) return;
        showToast("Analyzing (EvoLink)...", "info");
        try {
            const res = await fetch('https://text.pollinations.ai/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: "Expert prompt engineer. Return ONLY a Stable Diffusion prompt for this image." },
                        { role: 'user', content: [{ type: 'text', text: "Describe this image." }, { type: 'image_url', image_url: { url: att.data } }]}
                    ],
                    model: 'gpt-4o'
                })
            });
            const pText = await res.text();
            chatInput.value = pText.trim();
            chatInput.style.height = 'auto'; chatInput.style.height = chatInput.scrollHeight + 'px';
            sendBtn.disabled = false;
            showToast("Prompt Extracted!", "success");
        } catch (e) { showToast("Vision busy", "error"); }
    };

    window.removeAttachment = (id) => {
        attachments = attachments.filter(att => att.id !== id);
        renderAttachmentPreviews();
        if (attachments.length === 0 && !chatInput.value.trim()) sendBtn.disabled = true;
    };

    // --- History Logic ---
    function saveToHistory(prompt) {
        let history = JSON.parse(localStorage.getItem('chandra_history')) || [];
        const entry = prompt.trim() || (attachments.length > 0 ? "Files Attached" : "New Chat");
        if (!history.includes(entry)) {
            history.unshift(entry);
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
                <button class="history-delete" data-index="${index}">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </li>
        `).join('');

        // Add Listeners
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
        showToast("Item removed", "info");
    }

    // --- Core Synthesis ---
    async function sendMessage() {
        const text = chatInput.value.trim();
        const currentAttachments = [...attachments];
        if (!text && currentAttachments.length === 0) return;

        saveToHistory(text);
        chatInput.value = ''; chatInput.style.height = 'auto'; sendBtn.disabled = true;
        welcomeScreen.style.display = 'none'; attachments = []; renderAttachmentPreviews();

        appendMessage('user', text, false, new Date(), null, currentAttachments);
        const skeletonDiv = appendMessage('bot', '', true);
        scrollBottom();
        
        const settings = loadSettings();
        const cleanPrompt = text.replace(/generate|image|create|make/gi, '').trim() || "Synthesis";

        let w = 1024, h = 1024;
        if (settings.aspectRatio === '16:9') { w = 1280; h = 720; }
        else if (settings.aspectRatio === '9:16') { w = 720; h = 1280; }
        else if (settings.aspectRatio === '21:9') { w = 1440; h = 612; }
        w = Math.floor(w * parseFloat(settings.quality));
        h = Math.floor(h * parseFloat(settings.quality));

        let finalPrompt = `${cleanPrompt}, masterpiece, ultra-hd, 8k, photorealistic, sharp focus`;
        if (settings.imageStyle === 'anime') finalPrompt += `, vibrant anime illustration`;
        else if (settings.imageStyle === 'cinematic') finalPrompt += `, cinematic 3d render, unreal engine 5`;
        else if (settings.imageStyle === 'artistic') finalPrompt += `, artistic oil painting style`;

        try {
            if (settings.mode === 'cloud') await performCloudSynthesis(finalPrompt, w, h, settings, skeletonDiv);
            else if (settings.mode === 'a1111') await performA1111Synthesis(finalPrompt, w, h, settings, skeletonDiv);
        } catch (error) {
            if (skeletonDiv) skeletonDiv.remove();
            appendMessage('bot', `Engine Error: ${error.message}`);
            sendBtn.removeAttribute('disabled');
        }
    }

    async function performCloudSynthesis(prompt, w, h, settings, skeleton) {
        const seed = Math.floor(Math.random() * 1000000);
        const cloudUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&seed=${seed}&nologo=true&model=flux`;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            if (skeleton) skeleton.remove();
            appendMessage('bot', `**Synthesis Quality:** ${settings.quality}x | Steps: ${settings.steps}`, false, new Date(), cloudUrl);
            scrollBottom();
            sendBtn.removeAttribute('disabled');
        };
        img.onerror = () => { throw new Error("Cloud busy"); };
        img.src = cloudUrl;
    }

    async function performA1111Synthesis(prompt, w, h, settings, skeleton) {
        const url = settings.apiUrl || "http://127.0.0.1:7860";
        const res = await fetch(`${url}/sdapi/v1/txt2img`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, steps: parseInt(settings.steps), cfg_scale: parseFloat(settings.cfg), width: w, height: h })
        });
        const data = await res.json();
        if (skeleton) skeleton.remove();
        appendMessage('bot', `**Local Synthesis Ready**`, false, new Date(), `data:image/png;base64,${data.images[0]}`);
        scrollBottom();
        sendBtn.removeAttribute('disabled');
    }

    function appendMessage(sender, text, isSkeleton = false, date = new Date(), fileUrl = null, currentAttachments = []) {
        const div = document.createElement('div'); div.className = `message ${sender}`;
        const avatar = sender === 'user' ? 'U' : '<i class="fa-solid fa-wand-magic-sparkles"></i>';
        let media = ''; if (fileUrl) media = `<div class="message-media" style="margin-top:15px;"><img src="${fileUrl}" style="max-width:100%; border-radius:12px; box-shadow:var(--shadow-lg);"><button onclick="downloadFromDOM(this)" class="send-btn" style="width:auto; padding:0 20px; margin-top:10px; font-size:0.8rem;"><i class="fa-solid fa-download"></i> Download</button></div>`;
        let atts = ''; if (currentAttachments.length > 0) { atts = '<div class="message-attachments" style="margin-top:10px; display:flex; flex-direction:column; gap:8px;">'; currentAttachments.forEach(a => { if (a.type.startsWith('image/')) atts += `<img src="${a.data}" style="max-width:200px; border-radius:8px;">`; else if (a.type.startsWith('audio/')) atts += `<audio controls src="${a.data}"></audio>`; else if (a.type.startsWith('video/')) atts += `<video controls src="${a.data}"></video>`; else atts += `<div class="file-card"><i class="fa-solid fa-file file-icon"></i><div class="file-info"><span class="file-name">${a.name}</span><span class="file-size">${a.size}</span></div></div>`; }); atts += '</div>'; }
        div.innerHTML = `<div class="msg-avatar ${sender}">${avatar}</div><div class="msg-body"><div class="message-header"><span class="msg-sender">${sender==='user'?'User':'ChandraXImage'}</span><span class="message-time">${date.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span></div><div class="msg-text">${isSkeleton ? '<div class="skeleton-line"></div><div class="skeleton-line"></div>' : marked.parse(text)}</div>${atts}${media}</div>`;
        messagesWrapper.appendChild(div); scrollBottom(); return div;
    }

    window.downloadFromDOM = (btn) => {
        const img = btn.previousElementSibling;
        const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        canvas.toBlob(blob => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `ChandraX-${Date.now()}.png`; a.click(); });
    };

    function showToast(msg, type = 'success') {
        const t = document.createElement('div'); t.className = `toast ${type}`; t.innerText = msg;
        document.getElementById('toast-container').appendChild(t); setTimeout(() => t.remove(), 3000);
    }

    function loadSettings() {
        const s = {};
        Object.keys(settingsEls).forEach(k => { if (settingsEls[k]) s[k] = settingsEls[k].value; });
        return s;
    }

    // --- Listeners ---
    Object.values(settingsEls).forEach(el => {
        if (el) el.onchange = () => {
            updateSliderLabels();
            toggleLocalSettings();
        };
    });

    settingsEls.steps.oninput = updateSliderLabels;
    settingsEls.cfg.oninput = updateSliderLabels;

    themeToggleBtn.onclick = () => {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        localStorage.setItem('chandra_theme', isLight ? 'light' : 'dark');
        themeToggleBtn.querySelector('i').className = isLight ? 'fa-regular fa-moon' : 'fa-regular fa-sun';
    };

    mobileMenuBtn.onclick = () => { sidebar.classList.toggle('open'); sidebarOverlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none'; };
    sidebarOverlay.onclick = () => { sidebar.classList.remove('open'); sidebarOverlay.style.display = 'none'; };
    newChatBtn.onclick = () => { messagesWrapper.innerHTML = ''; welcomeScreen.style.display = 'flex'; currentChatId = null; };
    
    chatInput.oninput = function() { this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px'; sendBtn.disabled = !this.value.trim() && attachments.length === 0; };
    chatInput.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
    sendBtn.onclick = sendMessage;

    document.querySelectorAll('.suggestion-card').forEach(c => c.onclick = () => { chatInput.value = c.querySelector('p strong').innerText; sendMessage(); });

    init();
});
