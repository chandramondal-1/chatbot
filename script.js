document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const landingScreen = document.getElementById('landing-screen');
    const appContainer = document.getElementById('app-container');
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

    // Landing Hub Modal Elements
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

    // --- Firebase Initialization ---
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

    let currentUser = null;
    let authMode = 'login'; 

    // --- Transition Function ---
    function enterApp() {
        if (landingScreen) {
            landingScreen.style.opacity = '0';
            landingScreen.style.pointerEvents = 'none';
            setTimeout(() => {
                landingScreen.style.display = 'none';
                if (appContainer) {
                    appContainer.style.display = 'flex';
                    appContainer.style.opacity = '0';
                    setTimeout(() => appContainer.style.opacity = '1', 50);
                }
            }, 500);
        }
    }

    // --- Initialization ---
    function init() {
        if (localStorage.getItem('chandra_theme') === 'light') {
            document.body.classList.add('light-mode');
        }
        
        renderHistory();
        
        if (auth) {
            auth.onAuthStateChanged(user => {
                currentUser = user;
                updateUserUI(user);
                if (user) enterApp();
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

    // --- Landing Hub Actions ---
    if (tabLogin) tabLogin.onclick = () => { authMode = 'login'; tabLogin.classList.add('active'); tabSignup.classList.remove('active'); emailSubmitBtn.innerText = 'Login'; authSubtitle.innerText = 'Welcome back to the Laboratory'; };
    if (tabSignup) tabSignup.onclick = () => { authMode = 'signup'; tabSignup.classList.add('active'); tabLogin.classList.remove('active'); emailSubmitBtn.innerText = 'Create Account'; authSubtitle.innerText = 'Start your Extreme Synthesis journey'; };

    if (emailAuthForm) {
        emailAuthForm.onsubmit = async (e) => {
            e.preventDefault();
            if (!auth) return showToast("Config Required", "error");
            try {
                if (authMode === 'login') await auth.signInWithEmailAndPassword(authEmail.value, authPassword.value);
                else await auth.createUserWithEmailAndPassword(authEmail.value, authPassword.value);
            } catch (err) { showToast(err.message, "error"); }
        };
    }

    if (googleAuthBtn) googleAuthBtn.onclick = () => { if (auth) auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e => showToast(e.message, "error")); };
    
    if (anonAuthBtn) anonAuthBtn.onclick = () => { 
        if (auth && firebaseConfig.apiKey !== "YOUR_API_KEY") {
            auth.signInAnonymously().catch(e => showToast(e.message, "error"));
        } else {
            showToast("Entering as Guest...", "success");
            enterApp(); 
        }
    };

    if (logoutBtn) logoutBtn.onclick = () => { if (auth) auth.signOut().then(() => window.location.reload()); else window.location.reload(); };

    // --- Core Synthesis Logic ---
    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;
        saveToHistory(text);
        chatInput.value = ''; chatInput.style.height = 'auto'; sendBtn.disabled = true;
        if (welcomeScreen) welcomeScreen.style.display = 'none'; 
        appendMessage('user', text);
        const botMsgDiv = appendMessage('bot', '', true); scrollBottom();
        
        let finalPrompt = text;
        try {
            const res = await fetch('https://text.pollinations.ai/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [{ role: 'system', content: "Expand into a technical 32K prompt." }, { role: 'user', content: text }], model: 'gpt-4o' })
            });
            if (res.ok) finalPrompt = await res.text();
        } catch (e) { console.warn("EvoLink busy."); }

        performCloudSynthesis(finalPrompt, botMsgDiv);
    }

    async function performCloudSynthesis(prompt, botMsgDiv) {
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?nologo=true&model=flux`;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Busy");
            const blob = await res.blob();
            updateBotMessage(botMsgDiv, `**PRO SYNTHESIS COMPLETE**\n\n${prompt.substring(0, 100)}...`, URL.createObjectURL(blob));
            sendBtn.disabled = false;
        } catch (err) { updateBotMessage(botMsgDiv, "Engine saturated."); sendBtn.disabled = false; }
    }

    // --- UI Utilities ---
    function appendMessage(sender, text, isSkeleton = false) {
        const div = document.createElement('div'); div.className = `message ${sender}`;
        const avatar = sender === 'user' ? 'U' : `<img src="assets/bot-logo.png" class="bot-avatar-img">`;
        const content = isSkeleton ? '<div class="skeleton-line"></div>' : (typeof marked !== 'undefined' ? marked.parse(text) : text);
        div.innerHTML = `<div class="msg-avatar">${avatar}</div><div class="msg-body"><div class="msg-text">${content}</div></div>`;
        if (messagesWrapper) messagesWrapper.appendChild(div); scrollBottom(); return div;
    }

    function updateBotMessage(div, text, fileUrl = null) {
        const body = div.querySelector('.msg-text'); if (!body) return;
        body.innerHTML = typeof marked !== 'undefined' ? marked.parse(text) : text;
        if (fileUrl) {
            const media = document.createElement('div'); media.className = 'message-media';
            media.innerHTML = `<img src="${fileUrl}" style="max-width:100%; border-radius:12px; cursor:pointer;" onclick="window.open('${fileUrl}', '_blank')">`;
            div.querySelector('.msg-body').appendChild(media);
        }
        scrollBottom();
    }

    function renderHistory() {
        if (!historyList) return;
        const history = JSON.parse(localStorage.getItem('chandra_history')) || [];
        historyList.innerHTML = history.map(item => `<li class="history-item"><span class="history-text">${item}</span></li>`).join('');
    }

    function showToast(msg, type = 'success') {
        const container = document.getElementById('toast-container'); if (!container) return;
        const t = document.createElement('div'); t.className = `toast ${type}`; t.innerText = msg;
        container.appendChild(t); setTimeout(() => t.remove(), 3000);
    }

    function scrollBottom() { if (chatContainer) chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' }); }
    function saveToHistory(p) { let h = JSON.parse(localStorage.getItem('chandra_history')) || []; h.unshift(p); localStorage.setItem('chandra_history', JSON.stringify(h.slice(0, 10))); renderHistory(); }

    // --- Listeners ---
    if (newChatBtn) newChatBtn.onclick = () => { if (messagesWrapper) messagesWrapper.innerHTML = ''; if (welcomeScreen) welcomeScreen.style.display = 'flex'; };
    if (openSettingsBtn) openSettingsBtn.onclick = () => { if (settingsModal) settingsModal.style.display = 'flex'; };
    if (closeSettingsBtn) closeSettingsBtn.onclick = () => { if (settingsModal) settingsModal.style.display = 'none'; };
    if (themeToggleBtn) themeToggleBtn.onclick = () => { document.body.classList.toggle('light-mode'); };
    if (chatInput) {
        chatInput.oninput = function() { this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px'; sendBtn.disabled = !this.value.trim(); };
        chatInput.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
    }
    if (sendBtn) sendBtn.onclick = sendMessage;

    init();
});
