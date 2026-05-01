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
    const sidebarOverlay = document.createElement('div');
    
    // Settings elements
    const imageStyleSelect = document.getElementById('image-style-select');
    const aspectRatioSelect = document.getElementById('aspect-ratio-select');
    const resolutionSelect = document.getElementById('resolution-select');
    const imageModelSelect = document.getElementById('image-model-select');
    const themeToggleBtn = document.getElementById('theme-toggle');

    // Sidebar Overlay for mobile
    sidebarOverlay.className = 'sidebar-overlay';
    document.body.appendChild(sidebarOverlay);

    let currentChatId = null;
    let currentUser = null;

    const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('render.com')
        ? '' 
        : 'https://chatbot-1-dxrx.onrender.com';

    // --- History Logic (Local Storage) ---
    function saveToHistory(prompt) {
        let history = JSON.parse(localStorage.getItem('chandra_history')) || [];
        if (!history.includes(prompt)) {
            history.unshift(prompt);
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
                <i class="fa-regular fa-image"></i>
                <span class="history-text">${item}</span>
            </li>
        `).join('');

        document.querySelectorAll('.history-item').forEach(li => {
            li.addEventListener('click', () => {
                chatInput.value = li.querySelector('.history-text').innerText;
                sendMessage();
            });
        });
    }

    // --- Core Generation Logic ---
    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        saveToHistory(text);
        if (!currentChatId) createNewChat();

        chatInput.value = '';
        chatInput.style.height = 'auto';
        sendBtn.disabled = true;
        welcomeScreen.style.display = 'none';

        appendMessage('user', text);
        // Image Generation Flow
        const skeletonDiv = appendMessage('bot', '', true);
        
        try {
            const settings = loadSettings();
            let styleWrapper = '';
            const cleanPrompt = text.replace(/generate|image|create|make/gi, '').trim();

            if (settings.imageStyle === 'pro') {
                styleWrapper = `hyper-realistic professional photograph of ${cleanPrompt}. 8k uhd, highly detailed, sharp focus, masterpiece, commercial photography`;
            } else if (settings.imageStyle === 'anime') {
                styleWrapper = `vibrant anime style illustration of ${cleanPrompt}. high quality digital art, studio ghibli style, colorful, aesthetic, 4k`;
            } else if (settings.imageStyle === 'cinematic') {
                styleWrapper = `cinematic 3D render of ${cleanPrompt}. unreal engine 5, octane render, moody lighting, highly detailed, photorealistic, 8k`;
            } else if (settings.imageStyle === 'artistic') {
                styleWrapper = `expressive oil painting of ${cleanPrompt}. textured brushstrokes, fine art, rich colors, artistic masterpiece`;
            } else {
                styleWrapper = cleanPrompt;
            }

            const aspect = settings.aspectRatio;
            const resolution = settings.resolution;
            const model = settings.model;

            const imageUrl = `${API_BASE_URL}/api/proxy/image?prompt=${encodeURIComponent(styleWrapper)}&aspect_ratio=${aspect}&resolution=${resolution}&model=${model}`;
            
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = imageUrl;
            
            img.onload = () => {
                if (skeletonDiv) skeletonDiv.remove();
                const replyText = `**Prompt:** ${cleanPrompt}\n**Style:** ${settings.imageStyle} | **Ratio:** ${aspect} | **Res:** ${resolution}`;
                appendMessage('bot', replyText, false, new Date(), imageUrl, 'image/png');
                showToast("Image ready!");
                sendBtn.removeAttribute('disabled');
            };
            img.onerror = () => {
                if (skeletonDiv) skeletonDiv.remove();
                appendMessage('bot', "Generation failed. The server might be busy. Please try again.");
                sendBtn.removeAttribute('disabled');
            };
        } catch (error) {
            console.error("Gen Error:", error);
            if (skeletonDiv) skeletonDiv.remove();
            sendBtn.removeAttribute('disabled');
        }
    }

    // --- UI Helpers ---
    function appendMessage(sender, text, isSkeleton = false, date = new Date(), fileUrl = null, fileType = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        const avatarContent = sender === 'user' ? 'U' : '<i class="fa-solid fa-wand-magic-sparkles"></i>';
        const senderName = sender === 'user' ? 'User' : 'ChandraXImage';
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
                    <span class="msg-sender">${senderName}</span>
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
                link.download = `ChandraXImage-${Date.now()}.png`;
                link.click();
            }, 'image/png');
            showToast("Download started!");
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
            resolution: resolutionSelect.value,
            model: imageModelSelect.value
        };
    }

    function createNewChat() {
        currentChatId = Date.now().toString();
        messagesWrapper.innerHTML = '';
        welcomeScreen.style.display = 'flex';
    }

    // --- Listeners ---
    [imageStyleSelect, aspectRatioSelect, resolutionSelect, imageModelSelect].forEach(el => {
        el.addEventListener('change', () => {
            localStorage.setItem('ai_lab_settings', JSON.stringify(loadSettings()));
        });
    });

    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
    });

    mobileMenuBtn.addEventListener('click', () => { sidebar.classList.toggle('open'); });
    newChatBtn.addEventListener('click', createNewChat);
    renderHistory();
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
        sendBtn.disabled = !this.value.trim();
    });
    chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    sendBtn.addEventListener('click', sendMessage);

    document.querySelectorAll('.suggestion-card').forEach(card => {
        card.addEventListener('click', () => {
            chatInput.value = card.querySelector('p').innerText;
            sendMessage();
        });
    });
});
