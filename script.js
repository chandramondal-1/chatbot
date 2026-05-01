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
    const connectionMode = document.getElementById('connection-mode');
    const localSettings = document.getElementById('local-settings');
    const apiUrlInput = document.getElementById('api-url');
    const imageModelSelect = document.getElementById('image-model-select');
    const stepsSlider = document.getElementById('steps-slider');
    const cfgSlider = document.getElementById('cfg-slider');
    const stepsVal = document.getElementById('steps-val');
    const cfgVal = document.getElementById('cfg-val');
    const themeToggleBtn = document.getElementById('theme-toggle');

    // Attachment elements
    const attachBtn = document.getElementById('attach-btn');
    const fileInput = document.getElementById('file-input');
    const attachmentPreview = document.getElementById('attachment-preview');

    let currentChatId = null;
    let attachments = [];

    // --- Attachment Logic ---
    attachBtn.onclick = () => fileInput.click();

    fileInput.onchange = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            if (attachments.length >= 5) {
                showToast("Max 5 files allowed", "error");
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (re) => {
                const attachment = {
                    name: file.name,
                    size: (file.size / 1024).toFixed(1) + " KB",
                    type: file.type,
                    data: re.target.result,
                    id: Date.now() + Math.random()
                };
                attachments.push(attachment);
                renderAttachmentPreviews();
                sendBtn.disabled = false;
            };
            
            if (file.type.startsWith('image/') || file.type.startsWith('audio/') || file.type.startsWith('video/')) {
                reader.readAsDataURL(file);
            } else {
                reader.readAsText(file.slice(0, 100)); // Just read a bit for text/pdf
                // For PDF we just store the name/info
                reader.onload = () => {
                    attachments.push({
                        name: file.name,
                        size: (file.size / 1024).toFixed(1) + " KB",
                        type: file.type,
                        data: null, // Don't store full PDF data in memory
                        id: Date.now() + Math.random()
                    });
                    renderAttachmentPreviews();
                    sendBtn.disabled = false;
                };
            }
        });
        fileInput.value = '';
    };

    function renderAttachmentPreviews() {
        attachmentPreview.innerHTML = attachments.map(att => `
            <div class="preview-pill">
                ${att.type.startsWith('image/') ? `<img src="${att.data}">` : `<i class="fa-solid fa-file"></i>`}
                <span>${att.name}</span>
                <i class="fa-solid fa-xmark remove-attachment" onclick="removeAttachment(${att.id})"></i>
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
        let history = JSON.parse(localStorage.getItem('chandra_history')) || [];
        const cleanItem = prompt.trim() || (attachments.length > 0 ? "Attached files" : "New Chat");
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
        historyList.innerHTML = history.map((item, index) => `
            <li class="history-item" title="${item}">
                <div class="history-content" onclick="loadHistoryItem('${item.replace(/'/g, "\\'")}')">
                    <i class="fa-solid fa-image"></i>
                    <span class="history-text">${item.length > 20 ? item.substring(0, 20) + '...' : item}</span>
                </div>
                <button class="history-delete" onclick="deleteHistoryItem(${index})">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </li>
        `).join('');
    }

    window.loadHistoryItem = (prompt) => {
        chatInput.value = prompt;
        sendMessage();
    };

    window.deleteHistoryItem = (index) => {
        let history = JSON.parse(localStorage.getItem('chandra_history')) || [];
        history.splice(index, 1);
        localStorage.setItem('chandra_history', JSON.stringify(history));
        renderHistory();
        showToast("Item deleted", "info");
    };

    // --- Core Synthesis Engine (Cloud & Local Hub) ---
    async function sendMessage() {
        const text = chatInput.value.trim();
        const currentAttachments = [...attachments];
        if (!text && currentAttachments.length === 0) return;

        saveToHistory(text);
        if (!currentChatId) currentChatId = Date.now().toString();

        chatInput.value = '';
        chatInput.style.height = 'auto';
        sendBtn.disabled = true;
        welcomeScreen.style.display = 'none';
        attachments = [];
        renderAttachmentPreviews();

        appendMessage('user', text, false, new Date(), null, currentAttachments);
        const skeletonDiv = appendMessage('bot', '', true);
        
        const settings = loadSettings();
        const cleanPrompt = text.replace(/generate|image|create|make/gi, '').trim() || "Artistic synthesis";

        // 1. Resolution & Style
        let w = 1024, h = 1024;
        if (settings.aspectRatio === '16:9') { w = 1280; h = 720; }
        else if (settings.aspectRatio === '9:16') { w = 720; h = 1280; }
        else if (settings.aspectRatio === '21:9') { w = 1440; h = 612; }

        let finalPrompt = cleanPrompt;
        if (settings.imageStyle === 'anime') finalPrompt += `, vibrant anime style`;
        else if (settings.imageStyle === 'cinematic') finalPrompt += `, cinematic 3D render`;
        else if (settings.imageStyle === 'artistic') finalPrompt += `, fine art oil painting`;

        // 2. Synthesis Logic (Cloud vs Local API)
        try {
            if (settings.mode === 'cloud') {
                await performCloudSynthesis(finalPrompt, w, h, settings, skeletonDiv);
            } else if (settings.mode === 'a1111' || settings.mode === 'localai') {
                if (settings.mode === 'a1111') await performA1111Synthesis(finalPrompt, w, h, settings, skeletonDiv);
                else await performLocalAISynthesis(finalPrompt, w, h, settings, skeletonDiv);
            }
        } catch (error) {
            if (skeletonDiv && skeletonDiv.parentNode) skeletonDiv.remove();
            appendMessage('bot', `Synthesis Error: ${error.message}. Ensure your local server is running.`);
            sendBtn.removeAttribute('disabled');
        }
    }

    // --- Synthesis Implementations ---
    async function performCloudSynthesis(prompt, w, h, settings, skeleton) {
        const seed = Math.floor(Math.random() * 1000000);
        const engineLabel = settings.model === 'automatic1111' ? 'A1111-Style' : 'LocalAI-Style';
        const cloudPrompt = `${engineLabel} synthesis: ${prompt}, masterpiece, (steps: ${settings.steps}), (cfg: ${settings.cfg})`;
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cloudPrompt)}?width=${w}&height=${h}&seed=${seed}&nologo=true`;
        
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => finalizeSynthesis(imageUrl, `Cloud ${engineLabel}`, settings, skeleton);
        img.onerror = () => { throw new Error("Cloud engine busy"); };
        img.src = imageUrl;
    }

    async function performA1111Synthesis(prompt, w, h, settings, skeleton) {
        const url = settings.apiUrl || "http://127.0.0.1:7860";
        const response = await fetch(`${url}/sdapi/v1/txt2img`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: prompt,
                steps: parseInt(settings.steps),
                cfg_scale: parseFloat(settings.cfg),
                width: w,
                height: h
            })
        });
        const data = await response.json();
        finalizeSynthesis(`data:image/png;base64,${data.images[0]}`, "Local A1111", settings, skeleton);
    }

    async function performLocalAISynthesis(prompt, w, h, settings, skeleton) {
        const url = settings.apiUrl || "http://127.0.0.1:8080";
        const response = await fetch(`${url}/v1/images/generations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: prompt,
                size: `${w}x${h}`
            })
        });
        const data = await response.json();
        finalizeSynthesis(data.data[0].url, "LocalAI", settings, skeleton);
    }

    function finalizeSynthesis(url, engineName, settings, skeleton) {
        if (skeleton && skeleton.parentNode) skeleton.remove();
        appendMessage('bot', `**Engine:** ${engineName} (Steps: ${settings.steps} | CFG: ${settings.cfg})`, false, new Date(), url);
        showToast("Synthesis successful!");
        sendBtn.removeAttribute('disabled');
    }

    // --- UI Helpers ---
    function appendMessage(sender, text, isSkeleton = false, date = new Date(), fileUrl = null, currentAttachments = []) {
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
                            <i class="fa-solid fa-download"></i> Download Image
                        </button>
                    </div>
                </div>`;
        }

        // Attachments Rendering
        let attachmentHtml = '';
        if (currentAttachments && currentAttachments.length > 0) {
            attachmentHtml = '<div class="message-attachments" style="margin-top: 10px; display: flex; flex-direction: column; gap: 8px;">';
            currentAttachments.forEach(att => {
                if (att.type.startsWith('image/')) {
                    attachmentHtml += `<img src="${att.data}" style="max-width: 250px; border-radius: 8px; border: 1px solid var(--border-color);">`;
                } else if (att.type.startsWith('audio/')) {
                    attachmentHtml += `<audio controls src="${att.data}"></audio>`;
                } else if (att.type.startsWith('video/')) {
                    attachmentHtml += `<video controls src="${att.data}"></video>`;
                } else {
                    const icon = att.name.endsWith('.pdf') ? 'fa-file-pdf' : 'fa-file-lines';
                    attachmentHtml += `
                        <div class="file-card">
                            <i class="fa-solid ${icon} file-icon"></i>
                            <div class="file-info">
                                <span class="file-name">${att.name}</span>
                                <span class="file-size">${att.size}</span>
                            </div>
                        </div>`;
                }
            });
            attachmentHtml += '</div>';
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
                ${attachmentHtml}
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
                link.download = `Synthesis-${Date.now()}.png`;
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
            mode: connectionMode.value,
            apiUrl: apiUrlInput.value,
            model: imageModelSelect.value,
            steps: stepsSlider.value,
            cfg: cfgSlider.value
        };
    }

    stepsSlider.oninput = () => { stepsVal.innerText = stepsSlider.value; };
    cfgSlider.oninput = () => { cfgVal.innerText = cfgSlider.value; };

    [imageStyleSelect, aspectRatioSelect, connectionMode, apiUrlInput, imageModelSelect, stepsSlider, cfgSlider].forEach(el => {
        el.onchange = () => localStorage.setItem('chandra_settings', JSON.stringify(loadSettings()));
    });

    themeToggleBtn.onclick = () => document.body.classList.toggle('light-mode');
    mobileMenuBtn.onclick = () => sidebar.classList.toggle('open');
    newChatBtn.onclick = () => { messagesWrapper.innerHTML = ''; welcomeScreen.style.display = 'flex'; };
    
    chatInput.oninput = function() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
        sendBtn.disabled = !this.value.trim() && attachments.length === 0;
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
