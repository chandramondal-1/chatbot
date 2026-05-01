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
    
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userProfile = document.getElementById('user-profile');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');

    const googleAuthBtn = document.getElementById('google-auth-btn');
    const anonAuthBtn = document.getElementById('anon-auth-btn');

    const settingsModal = document.getElementById('settings-modal');
    const openSettingsBtn = document.getElementById('open-settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');

    const fantasticBg = document.querySelector('.fantastic-bg');

    // --- Parallax Effect ---
    document.addEventListener('mousemove', (e) => {
        if (fantasticBg) {
            const moveX = (e.clientX - window.innerWidth / 2) / 50;
            const moveY = (e.clientY - window.innerHeight / 2) / 50;
            fantasticBg.style.transform = `scale(1.1) translate(${moveX}px, ${moveY}px)`;
        }
    });

    // --- Firebase Logic ---
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

    function enterApp() {
        if (!landingScreen) return;
        landingScreen.style.opacity = '0';
        landingScreen.style.transform = 'scale(1.1)';
        setTimeout(() => {
            landingScreen.style.display = 'none';
            if (appContainer) {
                appContainer.style.display = 'flex';
                appContainer.style.opacity = '0';
                setTimeout(() => appContainer.style.opacity = '1', 50);
            }
        }, 600);
    }

    if (auth) {
        auth.onAuthStateChanged(user => {
            if (user) {
                if (userAvatar) userAvatar.src = user.photoURL || 'assets/bot-logo.png';
                if (userName) userName.innerText = user.displayName || user.email.split('@')[0];
                if (userProfile) userProfile.style.display = 'block';
                enterApp();
            }
        });
    }

    // --- Actions ---
    if (googleAuthBtn) googleAuthBtn.onclick = () => { if (auth) auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); };
    if (anonAuthBtn) anonAuthBtn.onclick = () => { enterApp(); localStorage.setItem('guest', 'true'); };
    if (logoutBtn) logoutBtn.onclick = () => { localStorage.removeItem('guest'); if (auth) auth.signOut().then(() => window.location.reload()); else window.location.reload(); };

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
                updateBotMessage(botMsgDiv, `**FANTASTIC SYNTHESIS COMPLETE**\nEngine: ${model.toUpperCase()}\nPrompt: ${text.substring(0,50)}...`, URL.createObjectURL(blob));
                sendBtn.disabled = false;
                saveToHistory(text);
                return;
            } catch (e) {}
        }
        updateBotMessage(botMsgDiv, "Engines saturated.");
        sendBtn.disabled = false;
    }

    function appendMessage(sender, text, isSkeleton = false) {
        const div = document.createElement('div'); div.className = `message ${sender}`;
        const content = isSkeleton ? '<div class="skeleton-line"></div><div class="skeleton-line" style="width:60%;"></div>' : (typeof marked !== 'undefined' ? marked.parse(text) : text);
        const avatar = sender === 'user' ? 'U' : '<img src="assets/bot-logo.png" style="width:100%; height:100%; border-radius:10px;">';
        div.innerHTML = `<div class="msg-avatar ${sender}">${avatar}</div><div class="msg-body"><div class="msg-text">${content}</div></div>`;
        messagesWrapper.appendChild(div); chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' }); return div;
    }

    function updateBotMessage(div, text, fileUrl = null) {
        const body = div.querySelector('.msg-text');
        body.innerHTML = typeof marked !== 'undefined' ? marked.parse(text) : text;
        if (fileUrl) {
            const media = document.createElement('div'); media.className = 'message-media';
            media.innerHTML = `<img src="${fileUrl}" style="max-width:100%; border-radius:18px; margin-top:15px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); border: 1px solid var(--glass-border); cursor:pointer;" onclick="window.open('${fileUrl}')">`;
            div.querySelector('.msg-body').appendChild(media);
        }
        chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
    }

    function renderHistory() {
        const history = JSON.parse(localStorage.getItem('chandra_history')) || [];
        if (historyList) historyList.innerHTML = history.map(item => `
            <li class="history-item">
                <i class="fa-regular fa-message" style="font-size:0.8rem; opacity:0.6;"></i>
                <span class="history-text">${item}</span>
            </li>
        `).join('');
    }

    function saveToHistory(p) {
        let h = JSON.parse(localStorage.getItem('chandra_history')) || [];
        if (!h.includes(p)) { h.unshift(p); localStorage.setItem('chandra_history', JSON.stringify(h.slice(0, 15))); renderHistory(); }
    }

    if (newChatBtn) newChatBtn.onclick = () => { messagesWrapper.innerHTML = ''; welcomeScreen.style.display = 'flex'; };
    if (openSettingsBtn) openSettingsBtn.onclick = () => settingsModal.style.display = 'flex';
    if (closeSettingsBtn) closeSettingsBtn.onclick = () => settingsModal.style.display = 'none';
    if (saveSettingsBtn) saveSettingsBtn.onclick = () => { settingsModal.style.display = 'none'; showToast("Laboratory Optimized", "success"); };
    
    if (chatInput) {
        chatInput.oninput = function() { this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px'; sendBtn.disabled = !this.value.trim(); };
        chatInput.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
    }
    if (sendBtn) sendBtn.onclick = sendMessage;

    function showToast(msg, type) { const c = document.getElementById('toast-container'); if (!c) return; const t = document.createElement('div'); t.className = `toast ${type}`; t.style.background = 'var(--accent-main)'; t.style.padding = '12px 24px'; t.style.borderRadius = '12px'; t.innerText = msg; c.appendChild(t); setTimeout(() => t.remove(), 3000); }

    if (localStorage.getItem('guest') === 'true') enterApp();
    renderHistory();
});
