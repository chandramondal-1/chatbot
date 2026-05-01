document.addEventListener('DOMContentLoaded', () => {
    // --- Firebase (GUEST MODE ENABLED BY DEFAULT) ---
    const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_PROJECT.firebaseapp.com",
        projectId: "YOUR_PROJECT",
        storageBucket: "YOUR_PROJECT.appspot.com",
        messagingSenderId: "YOUR_ID",
        appId: "YOUR_APP_ID"
    };
    
    let auth = null;
    if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== "YOUR_API_KEY") {
        try {
            firebase.initializeApp(firebaseConfig);
            auth = firebase.auth();
        } catch (e) { console.warn("Firebase Init bypassed."); }
    }

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
    
    // Auth Main Elements
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userProfile = document.getElementById('user-profile');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');

    // Auth Hub Modal Elements
    const authModal = document.getElementById('auth-modal');
    const closeAuthBtn = document.getElementById('close-auth-btn');
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const emailAuthForm = document.getElementById('email-auth-form');
    const authEmail = document.getElementById('auth-email');
    const authPassword = document.getElementById('auth-password');
    const emailSubmitBtn = document.getElementById('email-submit-btn');
    const googleAuthBtn = document.getElementById('google-auth-btn');
    const phoneAuthBtn = document.getElementById('phone-auth-btn');
    const anonAuthBtn = document.getElementById('anon-auth-btn');
    const authSubtitle = document.getElementById('auth-subtitle');

    // Modal Elements
    const settingsModal = document.getElementById('settings-modal');
    const openSettingsBtn = document.getElementById('open-settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');

    const settingsEls = {
        imageStyle: document.getElementById('image-style-select'),
        aspectRatio: document.getElementById('aspect-ratio-select'),
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
    let currentUser = null;
    let authMode = 'login'; // 'login' or 'signup'

    // --- Initialization ---
    function init() {
        if (localStorage.getItem('chandra_theme') === 'light') {
            document.body.classList.add('light-mode');
            const icon = themeToggleBtn ? themeToggleBtn.querySelector('i') : null;
            if (icon) icon.className = 'fa-regular fa-moon';
        }

        const savedSettings = JSON.parse(localStorage.getItem('chandra_settings')) || {};
        Object.keys(settingsEls).forEach(key => {
            if (savedSettings[key] && settingsEls[key]) {
                settingsEls[key].value = savedSettings[key];
            }
        });
        updateSliderLabels();
        renderHistory();

        if (auth) {
            auth.onAuthStateChanged(user => {
                currentUser = user;
                updateUserUI(user);
                if (user) authModal.style.display = 'none';
            });
        } else {
            updateUserUI(null);
        }
    }

    function updateUserUI(user) {
        if (user) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (userProfile) userProfile.style.display = 'block';
            if (userAvatar) userAvatar.src = user.photoURL || 'assets/bot-logo.png';
            if (userName) userName.innerText = user.displayName || user.email?.split('@')[0] || 'User';
            if (logoutBtn) logoutBtn.style.display = 'block';
        } else {
            if (loginBtn) loginBtn.style.display = 'flex';
            if (userProfile) {
                userProfile.style.display = 'block';
                userAvatar.src = 'assets/bot-logo.png';
                userName.innerText = 'Guest Session';
                if (logoutBtn) logoutBtn.style.display = 'none';
            }
        }
    }

    // --- Auth Hub Actions ---
    if (loginBtn) loginBtn.onclick = () => authModal.style.display = 'flex';
    if (closeAuthBtn) closeAuthBtn.onclick = () => authModal.style.display = 'none';

    tabLogin.onclick = () => {
        authMode = 'login';
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
        emailSubmitBtn.innerText = 'Login';
        authSubtitle.innerText = 'Welcome back to the Laboratory';
    };

    tabSignup.onclick = () => {
        authMode = 'signup';
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
        emailSubmitBtn.innerText = 'Create Account';
        authSubtitle.innerText = 'Start your Extreme Synthesis journey';
    };

    emailAuthForm.onsubmit = async (e) => {
        e.preventDefault();
        if (!auth) return showToast("Authentication Offline (Config Required)", "error");
        
        const email = authEmail.value;
        const pass = authPassword.value;
        emailSubmitBtn.disabled = true;
        emailSubmitBtn.innerText = 'Authenticating...';

        try {
            if (authMode === 'login') {
                await auth.signInWithEmailAndPassword(email, pass);
                showToast("Logged in successfully", "success");
            } else {
                await auth.createUserWithEmailAndPassword(email, pass);
                showToast("Account created successfully", "success");
            }
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            emailSubmitBtn.disabled = false;
            emailSubmitBtn.innerText = authMode === 'login' ? 'Login' : 'Create Account';
        }
    };

    googleAuthBtn.onclick = () => {
        if (!auth) return showToast("Google Auth Offline", "error");
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(e => showToast(e.message, "error"));
    };

    anonAuthBtn.onclick = () => {
        if (!auth) return showToast("Guest mode restricted to Local Storage only", "info");
        auth.signInAnonymously().catch(e => showToast(e.message, "error"));
    };

    phoneAuthBtn.onclick = () => {
        showToast("Phone Authentication requires domain verification. Please use Google or Email.", "info");
    };

    if (logoutBtn) {
        logoutBtn.onclick = () => {
            if (auth) auth.signOut().then(() => {
                showToast("Signed out successfully", "info");
                window.location.reload();
            });
        };
    }

    // --- Modal & UI Logic (Existing) ---
    if (openSettingsBtn) openSettingsBtn.onclick = () => settingsModal.style.display = 'flex';
    if (closeSettingsBtn) closeSettingsBtn.onclick = () => settingsModal.style.display = 'none';
    if (saveSettingsBtn) {
        saveSettingsBtn.onclick = () => {
            localStorage.setItem('chandra_settings', JSON.stringify(loadSettings()));
            settingsModal.style.display = 'none';
            showToast("Settings Saved", "success");
        };
    }
    window.onclick = (e) => { 
        if (e.target === settingsModal) settingsModal.style.display = 'none';
        if (e.target === authModal) authModal.style.display = 'none';
    };

    function updateSliderLabels() {
        if (settingsEls.stepsVal) settingsEls.stepsVal.innerText = settingsEls.steps.value;
        if (settingsEls.cfgVal) settingsEls.cfgVal.innerText = settingsEls.cfg.value;
    }

    function scrollBottom() {
        setTimeout(() => {
            if (chatContainer) chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
        }, 100);
    }

    // --- Attachment & Messaging Logic (Existing) ---
    if (attachBtn) attachBtn.onclick = () => fileInput.click();
    if (fileInput) {
        fileInput.onchange = (e) => {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                if (attachments.length >= 5) return showToast("Max 5 files", "error");
                const reader = new FileReader();
                reader.onload = (re) => {
                    attachments.push({ name: file.name, size: (file.size / 1024).toFixed(1) + " KB", type: file.type, data: re.target.result, id: Date.now() + Math.random() });
                    renderAttachmentPreviews();
                    sendBtn.disabled = false;
                };
                if (file.type.startsWith('image/')) reader.readAsDataURL(file);
                else reader.readAsText(file.slice(0, 100));
            });
            fileInput.value = '';
        };
    }

    function renderAttachmentPreviews() {
        if (attachmentPreview) {
            attachmentPreview.innerHTML = attachments.map(att => `
                <div class="preview-pill">
                    ${att.type.startsWith('image/') ? `<img src="${att.data}">` : `<i class="fa-solid fa-file"></i>`}
                    <span>${att.name.length > 10 ? att.name.substring(0, 10) + '...' : att.name}</span>
                    <i class="fa-solid fa-xmark" onclick="removeAttachment(${att.id})"></i>
                </div>
            `).join('');
        }
    }

    window.removeAttachment = (id) => {
        attachments = attachments.filter(att => att.id !== id);
        renderAttachmentPreviews();
        if (attachments.length === 0 && chatInput && !chatInput.value.trim()) sendBtn.disabled = true;
    };

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
                <div class="history-content"><i class="fa-solid fa-image"></i><span class="history-text">${item}</span></div>
                <button class="history-delete" data-index="${index}"><i class="fa-solid fa-trash-can"></i></button>
            </li>
        `).join('');
        document.querySelectorAll('.history-content').forEach(el => {
            el.onclick = () => { const prompt = decodeURIComponent(el.closest('.history-item').dataset.prompt); loadHistoryItem(prompt); };
        });
        document.querySelectorAll('.history-delete').forEach(el => {
            el.onclick = (e) => { e.stopPropagation(); deleteHistoryItem(parseInt(el.dataset.index)); };
        });
    }

    function loadHistoryItem(prompt) {
        if (messagesWrapper) messagesWrapper.innerHTML = '';
        if (welcomeScreen) welcomeScreen.style.display = 'none';
        if (chatInput) chatInput.value = prompt;
        if (window.innerWidth <= 768) { sidebar.classList.remove('open'); if (sidebarOverlay) sidebarOverlay.style.display = 'none'; }
        sendMessage();
    }

    function deleteHistoryItem(index) {
        let history = JSON.parse(localStorage.getItem('chandra_history')) || [];
        history.splice(index, 1);
        localStorage.setItem('chandra_history', JSON.stringify(history));
        renderHistory();
    }

    async function sendMessage() {
        const text = chatInput.value.trim();
        const currentAttachments = [...attachments];
        if (!text && currentAttachments.length === 0) return;
        saveToHistory(text);
        chatInput.value = ''; chatInput.style.height = 'auto'; sendBtn.disabled = true;
        if (welcomeScreen) welcomeScreen.style.display = 'none'; 
        attachments = []; renderAttachmentPreviews();
        appendMessage('user', text, false, new Date(), null, currentAttachments);
        const botMsgDiv = appendMessage('bot', '', true);
        scrollBottom();
        
        let finalPrompt = text;
        try {
            const expansionSystemPrompt = "You are CHANDRA x IMAGE Master Prompt Engineer. Expand the user description into a technical 32K prompt. Return ONLY the string.";
            const textResponse = await fetch('https://text.pollinations.ai/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [{ role: 'system', content: expansionSystemPrompt }, { role: 'user', content: text }], model: 'gpt-4o' })
            });
            if (textResponse.ok) finalPrompt = await textResponse.text();
        } catch (e) { console.warn("EvoLink Expansion busy."); }

        const settings = loadSettings();
        const qFactor = parseFloat(settings.quality || 4);
        let w = 512 * qFactor, h = 512 * qFactor;
        if (settings.aspectRatio === '16:9') { w = 1280 * (qFactor/4); h = 720 * (qFactor/4); }
        else if (settings.aspectRatio === '9:16') { w = 720 * (qFactor/4); h = 1280 * (qFactor/4); }
        const MAX_RES = 2048;
        if (w > MAX_RES || h > MAX_RES) { const r = Math.min(MAX_RES/w, MAX_RES/h); w=Math.floor(w*r); h=Math.floor(h*r); }
        try { await performCloudSynthesis(finalPrompt, Math.floor(w), Math.floor(h), settings, botMsgDiv); }
        catch (error) { updateBotMessage(botMsgDiv, `Synthesis Error: ${error.message}`); sendBtn.disabled = false; }
    }

    async function performCloudSynthesis(prompt, w, h, settings, botMsgDiv) {
        const seed = Math.floor(Math.random() * 1000000);
        const models = ['flux', 'turbo', 'dreamshaper']; 
        for (let i = 0; i < models.length; i++) {
            const currentModel = models[i];
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&seed=${seed}&nologo=true&model=${currentModel}`;
            try {
                if (i > 0) updateBotStatus(botMsgDiv, `Switching to ${currentModel} engine...`);
                const controller = new AbortController();
                const tId = setTimeout(() => controller.abort(), 25000);
                const res = await fetch(url, { signal: controller.signal });
                clearTimeout(tId);
                if (!res.ok) throw new Error("API Busy");
                const blob = await res.blob();
                updateBotMessage(botMsgDiv, `**CHANDRA x IMAGE 32K Success**\n\n**Engine:** ${currentModel.toUpperCase()}\n\n**Expanded Prompt:** ${prompt}`, URL.createObjectURL(blob));
                sendBtn.disabled = false;
                return;
            } catch (err) {
                if (i === models.length - 1) { updateBotMessage(botMsgDiv, "Engines saturated. Please try again in 10s."); sendBtn.disabled = false; }
            }
        }
    }

    function updateBotStatus(div, statusText) {
        const msgBody = div.querySelector('.msg-text');
        if (msgBody) msgBody.innerHTML = `<div class="skeleton-line"></div><p style="font-size:0.8rem; opacity:0.6;">${statusText}</p>`;
    }

    function appendMessage(sender, text, isSkeleton = false, date = new Date(), fileUrl = null, currentAttachments = []) {
        const div = document.createElement('div'); div.className = `message ${sender}`;
        const avatar = sender === 'user' ? 'U' : `<img src="assets/bot-logo.png" class="bot-avatar-img" onerror="this.outerHTML='<i class=\'fa-solid fa-wand-magic-sparkles\'></i>'">`;
        const htmlContent = isSkeleton ? '<div class="skeleton-line"></div><div class="skeleton-line"></div>' : (typeof marked !== 'undefined' ? marked.parse(text || "") : text || "");
        div.innerHTML = `<div class="msg-avatar ${sender}">${avatar}</div><div class="msg-body"><div class="message-header"><span class="msg-sender">${sender==='user'?'User':'CHANDRA x IMAGE'}</span><span class="message-time">${date.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span></div><div class="msg-text">${htmlContent}</div></div>`;
        if (messagesWrapper) messagesWrapper.appendChild(div); scrollBottom(); return div;
    }

    function updateBotMessage(div, text, fileUrl = null) {
        const msgBody = div.querySelector('.msg-text'); if (!msgBody) return;
        msgBody.innerHTML = typeof marked !== 'undefined' ? marked.parse(text) : text;
        if (fileUrl) {
            const media = document.createElement('div'); media.className = 'message-media'; media.style.marginTop = '15px';
            media.innerHTML = `<img src="${fileUrl}" style="max-width:100%; border-radius:12px; box-shadow:var(--shadow-lg);"><br><button onclick="downloadFromDOM(this)" class="send-btn" style="width:auto; padding:0 20px; margin-top:10px; font-size:0.8rem;"><i class="fa-solid fa-download"></i> Download</button>`;
            div.querySelector('.msg-body').appendChild(media);
        }
        scrollBottom();
    }

    window.downloadFromDOM = (btn) => {
        const img = btn.parentNode.querySelector('img'); if (!img) return;
        const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        canvas.toBlob(blob => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `CHANDRA-${Date.now()}.png`; a.click(); });
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

    Object.values(settingsEls).forEach(el => { if (el) el.onchange = () => updateSliderLabels(); });
    if (settingsEls.steps) settingsEls.steps.oninput = updateSliderLabels;
    if (settingsEls.cfg) settingsEls.cfg.oninput = updateSliderLabels;
    themeToggleBtn.onclick = () => {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        localStorage.setItem('chandra_theme', isLight ? 'light' : 'dark');
        const icon = themeToggleBtn.querySelector('i'); if (icon) icon.className = isLight ? 'fa-regular fa-moon' : 'fa-regular fa-sun';
    };
    if (mobileMenuBtn) mobileMenuBtn.onclick = () => { sidebar.classList.toggle('open'); if (sidebarOverlay) sidebarOverlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none'; };
    if (sidebarOverlay) sidebarOverlay.onclick = () => { sidebar.classList.remove('open'); sidebarOverlay.style.display = 'none'; };
    if (newChatBtn) newChatBtn.onclick = () => { messagesWrapper.innerHTML = ''; welcomeScreen.style.display = 'flex'; };
    if (chatInput) {
        chatInput.oninput = function() { this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px'; sendBtn.disabled = !this.value.trim() && attachments.length === 0; };
        chatInput.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
    }
    if (sendBtn) sendBtn.onclick = sendMessage;

    init();
});
