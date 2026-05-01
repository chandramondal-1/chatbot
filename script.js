document.addEventListener('DOMContentLoaded', () => {
    // --- Optimized Core Elements ---
    const landingScreen = document.getElementById('landing-screen');
    const appContainer = document.getElementById('app-container');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatContainer = document.getElementById('chat-container');
    const messagesWrapper = document.getElementById('messages-wrapper');
    const welcomeScreen = document.getElementById('welcome-screen');
    const newChatBtn = document.getElementById('new-chat-btn');
    const historyList = document.getElementById('history-list');
    
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userProfile = document.getElementById('user-profile');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');

    const authEmail = document.getElementById('auth-email');
    const authPassword = document.getElementById('auth-password');
    const emailSubmitBtn = document.getElementById('email-submit-btn');
    const googleAuthBtn = document.getElementById('google-auth-btn');
    const anonAuthBtn = document.getElementById('anon-auth-btn');

    const settingsModal = document.getElementById('settings-modal');
    const openSettingsBtn = document.getElementById('open-settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');

    // --- Firebase Logic (Zero-Error Mode) ---
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
        try { firebase.initializeApp(firebaseConfig); auth = firebase.auth(); } catch (e) {}
    }

    // --- Entry Logic ---
    function enterApp() {
        if (!landingScreen) return;
        landingScreen.style.opacity = '0';
        setTimeout(() => {
            landingScreen.style.display = 'none';
            if (appContainer) {
                appContainer.style.display = 'flex';
                appContainer.style.opacity = '1';
            }
        }, 500);
    }

    if (auth) {
        auth.onAuthStateChanged(user => {
            if (user) {
                if (userAvatar) userAvatar.src = user.photoURL || 'assets/bot-logo.png';
                if (userName) userName.innerText = user.displayName || user.email.split('@')[0];
                if (loginBtn) loginBtn.style.display = 'none';
                if (userProfile) userProfile.style.display = 'block';
                enterApp();
            }
        });
    }

    // --- Auth Actions ---
    if (googleAuthBtn) googleAuthBtn.onclick = () => { if (auth) auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); };
    if (anonAuthBtn) anonAuthBtn.onclick = () => { enterApp(); localStorage.setItem('guest', 'true'); };
    if (logoutBtn) logoutBtn.onclick = () => { localStorage.removeItem('guest'); if (auth) auth.signOut().then(() => window.location.reload()); else window.location.reload(); };

    if (emailSubmitBtn) {
        emailSubmitBtn.onclick = async (e) => {
            e.preventDefault();
            if (!auth) return showToast("Config Required", "error");
            try { await auth.signInWithEmailAndPassword(authEmail.value, authPassword.value); } 
            catch (err) { showToast(err.message, "error"); }
        };
    }

    // --- Synthesis Logic (Clean Triple-Engine) ---
    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;
        
        chatInput.value = ''; chatInput.style.height = 'auto'; sendBtn.disabled = true;
        if (welcomeScreen) welcomeScreen.style.display = 'none'; 
        
        appendMessage('user', text);
        const botMsgDiv = appendMessage('bot', '', true);
        
        const models = ['flux', 'turbo', 'dreamshaper'];
        for (const model of models) {
            try {
                const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(text)}?nologo=true&model=${model}`;
                const res = await fetch(url);
                if (!res.ok) throw new Error();
                const blob = await res.blob();
                updateBotMessage(botMsgDiv, `**Synthesis Successful**\nEngine: ${model.toUpperCase()}`, URL.createObjectURL(blob));
                sendBtn.disabled = false;
                saveToHistory(text);
                return;
            } catch (e) {}
        }
        updateBotMessage(botMsgDiv, "Engines saturated. Try again.");
        sendBtn.disabled = false;
    }

    function appendMessage(sender, text, isSkeleton = false) {
        const div = document.createElement('div'); div.className = `message ${sender}`;
        const content = isSkeleton ? '<div class="skeleton-line"></div>' : (typeof marked !== 'undefined' ? marked.parse(text) : text);
        div.innerHTML = `<div class="msg-avatar ${sender}">${sender==='user'?'U':'<img src="assets/bot-logo.png">'}</div><div class="msg-body"><div class="msg-text">${content}</div></div>`;
        messagesWrapper.appendChild(div); chatContainer.scrollTo(0, chatContainer.scrollHeight); return div;
    }

    function updateBotMessage(div, text, fileUrl = null) {
        const body = div.querySelector('.msg-text');
        body.innerHTML = typeof marked !== 'undefined' ? marked.parse(text) : text;
        if (fileUrl) {
            const media = document.createElement('div'); media.className = 'message-media';
            media.innerHTML = `<img src="${fileUrl}" style="max-width:100%; border-radius:12px; margin-top:10px; cursor:pointer;" onclick="window.open('${fileUrl}')">`;
            div.querySelector('.msg-body').appendChild(media);
        }
        chatContainer.scrollTo(0, chatContainer.scrollHeight);
    }

    // --- History & UI ---
    function renderHistory() {
        const history = JSON.parse(localStorage.getItem('chandra_history')) || [];
        if (historyList) historyList.innerHTML = history.map(item => `<li class="history-item"><span class="history-text">${item}</span></li>`).join('');
    }

    function saveToHistory(p) {
        let h = JSON.parse(localStorage.getItem('chandra_history')) || [];
        if (!h.includes(p)) { h.unshift(p); localStorage.setItem('chandra_history', JSON.stringify(h.slice(0, 15))); renderHistory(); }
    }

    if (newChatBtn) newChatBtn.onclick = () => { messagesWrapper.innerHTML = ''; welcomeScreen.style.display = 'flex'; };
    if (openSettingsBtn) openSettingsBtn.onclick = () => settingsModal.style.display = 'flex';
    if (closeSettingsBtn) closeSettingsBtn.onclick = () => settingsModal.style.display = 'none';
    if (saveSettingsBtn) saveSettingsBtn.onclick = () => { settingsModal.style.display = 'none'; showToast("Settings Applied", "success"); };
    
    if (chatInput) {
        chatInput.oninput = function() { this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px'; sendBtn.disabled = !this.value.trim(); };
        chatInput.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
    }
    if (sendBtn) sendBtn.onclick = sendMessage;

    function showToast(msg, type) { console.log(`[${type}] ${msg}`); }

    if (localStorage.getItem('guest') === 'true') enterApp();
    renderHistory();
});
