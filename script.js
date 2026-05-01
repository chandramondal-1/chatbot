document.addEventListener('DOMContentLoaded', () => {
    // --- Advanced UI: Background Interaction ---
    const bgMesh = document.querySelector('.bg-mesh');
    document.addEventListener('mousemove', (e) => {
        if (bgMesh) {
            const x = e.clientX / window.innerWidth;
            const y = e.clientY / window.innerHeight;
            bgMesh.style.background = `
                radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(124, 77, 255, 0.2) 0%, transparent 50%),
                radial-gradient(circle at ${100 - (x * 100)}% ${100 - (y * 100)}%, rgba(0, 229, 255, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 50% 50%, rgba(5, 5, 5, 1) 0%, #000 100%)
            `;
        }
    });

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
    let authMode = 'login'; 

    // --- Initialization ---
    function init() {
        if (localStorage.getItem('chandra_theme') === 'light') {
            document.body.classList.add('light-mode');
            const icon = themeToggleBtn ? themeToggleBtn.querySelector('i') : null;
            if (icon) icon.className = 'fa-regular fa-moon';
        }
        const savedSettings = JSON.parse(localStorage.getItem('chandra_settings')) || {};
        Object.keys(settingsEls).forEach(key => { if (savedSettings[key] && settingsEls[key]) settingsEls[key].value = savedSettings[key]; });
        updateSliderLabels();
        renderHistory();
        if (auth) {
            auth.onAuthStateChanged(user => {
                currentUser = user;
                updateUserUI(user);
                if (user) if (authModal) authModal.style.display = 'none';
            });
        } else { updateUserUI(null); }
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
    if (tabLogin) tabLogin.onclick = () => { authMode = 'login'; tabLogin.classList.add('active'); tabSignup.classList.remove('active'); emailSubmitBtn.innerText = 'Login'; authSubtitle.innerText = 'Welcome back to the Laboratory'; };
    if (tabSignup) tabSignup.onclick = () => { authMode = 'signup'; tabSignup.classList.add('active'); tabLogin.classList.remove('active'); emailSubmitBtn.innerText = 'Create Account'; authSubtitle.innerText = 'Start your Extreme Synthesis journey'; };

    if (emailAuthForm) {
        emailAuthForm.onsubmit = async (e) => {
            e.preventDefault();
            if (!auth) return showToast("Auth Offline", "error");
            const email = authEmail.value; const pass = authPassword.value;
            emailSubmitBtn.disabled = true; emailSubmitBtn.innerText = 'Authenticating...';
            try {
                if (authMode === 'login') await auth.signInWithEmailAndPassword(email, pass);
                else await auth.createUserWithEmailAndPassword(email, pass);
            } catch (err) { showToast(err.message, "error"); }
            finally { emailSubmitBtn.disabled = false; emailSubmitBtn.innerText = authMode === 'login' ? 'Login' : 'Create Account'; }
        };
    }

    if (googleAuthBtn) googleAuthBtn.onclick = () => { if (auth) auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e => showToast(e.message, "error")); };
    if (anonAuthBtn) anonAuthBtn.onclick = () => { if (auth) auth.signInAnonymously().catch(e => showToast(e.message, "error")); };

    if (logoutBtn) logoutBtn.onclick = () => { if (auth) auth.signOut().then(() => window.location.reload()); };

    // --- Core Synthesis Logic ---
    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text && attachments.length === 0) return;
        saveToHistory(text);
        chatInput.value = ''; chatInput.style.height = 'auto'; sendBtn.disabled = true;
        if (welcomeScreen) welcomeScreen.style.display = 'none'; 
        const currentAttachments = [...attachments]; attachments = []; renderAttachmentPreviews();
        appendMessage('user', text, false, new Date(), null, currentAttachments);
        const botMsgDiv = appendMessage('bot', '', true); scrollBottom();
        
        let finalPrompt = text;
        try {
            const res = await fetch('https://text.pollinations.ai/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [{ role: 'system', content: "You are CHANDRA x IMAGE Master Prompt Engineer. Expand the user description into a technical 32K prompt." }, { role: 'user', content: text }], model: 'gpt-4o' })
            });
            if (res.ok) finalPrompt = await res.text();
        } catch (e) { console.warn("EvoLink busy."); }

        const settings = loadSettings();
        const q = parseFloat(settings.quality || 4);
        let w = 512 * q, h = 512 * q;
        if (settings.aspectRatio === '16:9') { w = 1280 * (q/4); h = 720 * (q/4); }
        else if (settings.aspectRatio === '9:16') { w = 720 * (q/4); h = 1280 * (q/4); }
        const MAX = 2048; if (w > MAX || h > MAX) { const r = Math.min(MAX/w, MAX/h); w=Math.floor(w*r); h=Math.floor(h*r); }
        
        await performCloudSynthesis(finalPrompt, Math.floor(w), Math.floor(h), settings, botMsgDiv);
    }

    async function performCloudSynthesis(prompt, w, h, settings, botMsgDiv) {
        const seed = Math.floor(Math.random() * 1000000);
        const models = ['flux', 'turbo', 'dreamshaper']; 
        for (let i = 0; i < models.length; i++) {
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&seed=${seed}&nologo=true&model=${models[i]}`;
            try {
                if (i > 0) updateBotStatus(botMsgDiv, `Switching to ${models[i]} engine...`);
                const controller = new AbortController();
                const tId = setTimeout(() => controller.abort(), 25000);
                const res = await fetch(url, { signal: controller.signal });
                clearTimeout(tId);
                if (!res.ok) throw new Error("Busy");
                const blob = await res.blob();
                updateBotMessage(botMsgDiv, `**PRO SYNTHESIS COMPLETE**\n\n**Engine:** ${models[i].toUpperCase()}\n\n${prompt.substring(0, 150)}...`, URL.createObjectURL(blob));
                sendBtn.disabled = false;
                return;
            } catch (err) { if (i === models.length - 1) { updateBotMessage(botMsgDiv, "Engines saturated."); sendBtn.disabled = false; } }
        }
    }

    // --- UI Utilities ---
    function appendMessage(sender, text, isSkeleton = false, date = new Date(), fileUrl = null, currentAttachments = []) {
        const div = document.createElement('div'); div.className = `message ${sender}`;
        const avatar = sender === 'user' ? 'U' : `<img src="assets/bot-logo.png" class="bot-avatar-img" onerror="this.outerHTML='<i class=\'fa-solid fa-wand-magic-sparkles\'></i>'">`;
        const content = isSkeleton ? '<div class="skeleton-line"></div><div class="skeleton-line" style="width:60%;"></div>' : (typeof marked !== 'undefined' ? marked.parse(text || "") : text || "");
        div.innerHTML = `<div class="msg-avatar ${sender}">${avatar}</div><div class="msg-body"><div class="message-header"><span class="msg-sender">${sender==='user'?'You':'CHANDRA x IMAGE'}</span><span class="message-time">${date.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span></div><div class="msg-text">${content}</div></div>`;
        if (messagesWrapper) messagesWrapper.appendChild(div); scrollBottom(); return div;
    }

    function updateBotMessage(div, text, fileUrl = null) {
        const body = div.querySelector('.msg-text'); if (!body) return;
        body.innerHTML = typeof marked !== 'undefined' ? marked.parse(text) : text;
        if (fileUrl) {
            const media = document.createElement('div'); media.className = 'message-media'; media.style.marginTop = '15px';
            media.innerHTML = `<img src="${fileUrl}" style="max-width:100%; border-radius:16px; box-shadow:var(--shadow-lg); border: 1px solid var(--glass-border); cursor:pointer;" onclick="window.open('${fileUrl}', '_blank')"><br><button onclick="downloadFromDOM(this)" class="send-btn" style="width:auto; padding:0 20px; margin-top:10px; font-size:0.8rem; height:36px;"><i class="fa-solid fa-download"></i> Download 4K</button>`;
            div.querySelector('.msg-body').appendChild(media);
        }
        scrollBottom();
    }

    function updateBotStatus(div, status) {
        const body = div.querySelector('.msg-text');
        if (body) body.innerHTML = `<div class="skeleton-line"></div><p style="font-size:0.75rem; opacity:0.6; font-weight:600; letter-spacing:0.5px;">${status.toUpperCase()}</p>`;
    }

    function renderHistory() {
        if (!historyList) return;
        const history = JSON.parse(localStorage.getItem('chandra_history')) || [];
        historyList.innerHTML = history.map((item, index) => `
            <li class="history-item" data-prompt="${encodeURIComponent(item)}">
                <i class="fa-regular fa-message" style="font-size:0.8rem;"></i>
                <span class="history-text">${item}</span>
                <i class="fa-solid fa-trash-can history-delete" style="font-size:0.7rem; opacity:0; transition:0.3s;" data-index="${index}"></i>
            </li>
        `).join('');
        document.querySelectorAll('.history-item').forEach(el => {
            el.onclick = (e) => { 
                if (e.target.classList.contains('history-delete')) {
                    let h = JSON.parse(localStorage.getItem('chandra_history')); h.splice(parseInt(e.target.dataset.index), 1);
                    localStorage.setItem('chandra_history', JSON.stringify(h)); renderHistory(); return;
                }
                if (messagesWrapper) messagesWrapper.innerHTML = ''; if (welcomeScreen) welcomeScreen.style.display = 'none';
                chatInput.value = decodeURIComponent(el.dataset.prompt); sendMessage(); 
            };
        });
    }

    function showToast(msg, type = 'success') {
        const container = document.getElementById('toast-container'); if (!container) return;
        const t = document.createElement('div'); t.className = `toast ${type}`; t.innerText = msg;
        container.appendChild(t); setTimeout(() => t.remove(), 3000);
    }

    function loadSettings() {
        const s = {}; Object.keys(settingsEls).forEach(k => { if (settingsEls[k]) s[k] = settingsEls[k].value; }); return s;
    }

    function updateSliderLabels() {
        if (settingsEls.stepsVal) settingsEls.stepsVal.innerText = settingsEls.steps.value;
        if (settingsEls.cfgVal) settingsEls.cfgVal.innerText = settingsEls.cfg.value;
    }

    function scrollBottom() { setTimeout(() => { if (chatContainer) chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' }); }, 100); }

    // --- Listeners ---
    if (newChatBtn) newChatBtn.onclick = () => { if (messagesWrapper) messagesWrapper.innerHTML = ''; if (welcomeScreen) welcomeScreen.style.display = 'flex'; };
    if (openSettingsBtn) openSettingsBtn.onclick = () => { if (settingsModal) settingsModal.style.display = 'flex'; };
    if (closeSettingsBtn) closeSettingsBtn.onclick = () => { if (settingsModal) settingsModal.style.display = 'none'; };
    if (saveSettingsBtn) saveSettingsBtn.onclick = () => { localStorage.setItem('chandra_settings', JSON.stringify(loadSettings())); settingsModal.style.display = 'none'; showToast("Optimization Applied", "success"); };
    
    themeToggleBtn.onclick = () => {
        document.body.classList.toggle('light-mode');
        localStorage.setItem('chandra_theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
        const icon = themeToggleBtn.querySelector('i'); if (icon) icon.className = document.body.classList.contains('light-mode') ? 'fa-regular fa-moon' : 'fa-regular fa-sun';
    };

    if (chatInput) {
        chatInput.oninput = function() { this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px'; sendBtn.disabled = !this.value.trim(); };
        chatInput.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
    }
    if (sendBtn) sendBtn.onclick = sendMessage;

    init();
});
