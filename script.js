// --- Firebase Modular Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { 
    getFirestore, collection, addDoc, getDocs, query, orderBy, 
    serverTimestamp, onSnapshot, doc, deleteDoc, setDoc, updateDoc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDANJ-7C4CNHCOsrUGpZL6mN3bJg71nIVo",
  authDomain: "chatbot-20954.firebaseapp.com",
  projectId: "chatbot-20954",
  storageBucket: "chatbot-20954.firebasestorage.app",
  messagingSenderId: "196542676864",
  appId: "1:196542676864:web:9039292a8a542cdaaf8b65"
};

// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('render.com')
    ? '' 
    : 'https://chatbot-1-dxrx.onrender.com'; // Linked to your Render backend!

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

let currentUser = null;
let currentChatId = null;
let chatListUnsubscribe = null;
let messageUnsubscribe = null;

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const messagesWrapper = document.getElementById('messages-wrapper');
    const welcomeScreen = document.getElementById('welcome-screen');
    const chatContainer = document.getElementById('chat-container');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const inputContainer = document.querySelector('.input-container');
    const toastContainer = document.getElementById('toast-container');
    
    // Advanced Settings Elements
    const imageStyleSelect = document.getElementById('image-style-select');
    const aspectRatioSelect = document.getElementById('aspect-ratio-select');
    const resolutionSelect = document.getElementById('resolution-select');
    const imageModelSelect = document.getElementById('image-model-select');
    
    // Auth Elements
    const authBtn = document.getElementById('auth-btn');
    const authText = document.getElementById('auth-text');
    const historyList = document.getElementById('history-list');

    // --- Authentication Logic ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            authText.textContent = `Log out`;
            subscribeToChatList();
        } else {
            currentUser = null;
            authText.textContent = 'Log in';
            historyList.innerHTML = '<li class="history-item">Log in to save history</li>';
            if (chatListUnsubscribe) chatListUnsubscribe();
            resetUI();
        }
    });

    authBtn.addEventListener('click', async () => {
        if (currentUser) {
            try { await signOut(auth); } catch (error) { console.error("Error signing out:", error); }
        } else {
            try { await signInWithPopup(auth, provider); } catch (error) { console.error("Firebase Auth Error:", error.message); }
        }
    });

    // --- Chat Management Logic ---
    function subscribeToChatList() {
        if (!currentUser) return;
        const chatsRef = collection(db, 'users', currentUser.uid, 'chats');
        const q = query(chatsRef, orderBy('updatedAt', 'desc'));
        if (chatListUnsubscribe) chatListUnsubscribe();
        chatListUnsubscribe = onSnapshot(q, (snapshot) => {
            historyList.innerHTML = '';
            if (snapshot.empty) {
                historyList.innerHTML = '<li class="history-item"><div class="history-content"><span class="history-title">No generations yet</span></div></li>';
                return;
            }
            snapshot.forEach((doc) => {
                const chatData = doc.data();
                const chatId = doc.id;
                const li = document.createElement('li');
                li.className = `history-item ${currentChatId === chatId ? 'active' : ''}`;
                li.dataset.id = chatId;
                li.innerHTML = `
                    <i class="fa-regular fa-image" style="margin-right: 0.75rem; font-size: 0.8rem;"></i>
                    <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${chatData.title || 'New Image'}</span>
                    <div class="history-actions">
                        <button class="delete-chat" title="Delete"><i class="fa-regular fa-trash-can"></i></button>
                    </div>
                `;
                li.addEventListener('click', (e) => {
                    if (e.target.closest('.history-actions')) return;
                    selectChat(chatId);
                });
                const deleteBtn = li.querySelector('.delete-chat');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        deleteChat(chatId);
                    });
                }
                historyList.appendChild(li);
            });
        });
    }

    async function selectChat(chatId) {
        if (currentChatId === chatId) return;
        currentChatId = chatId;
        document.querySelectorAll('.history-item').forEach(item => {
            item.classList.toggle('active', item.dataset.id === chatId);
        });
        welcomeScreen.style.display = 'none';
        messagesWrapper.style.display = 'flex';
        messagesWrapper.innerHTML = '';
        if (messageUnsubscribe) messageUnsubscribe();
        const messagesRef = collection(db, 'users', currentUser.uid, 'chats', chatId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));
        messageUnsubscribe = onSnapshot(q, (snapshot) => {
            messagesWrapper.innerHTML = '';
            snapshot.forEach((doc) => {
                const msg = doc.data();
                appendMessage(msg.sender, msg.text, false, msg.timestamp?.toDate(), msg.fileUrl, msg.fileType);
            });
            scrollToBottom();
        });
        sidebar.classList.remove('open');
        sidebarOverlay.style.display = 'none';
    }

    async function deleteChat(chatId) {
        if (!confirm("Delete this generation history?")) return;
        try {
            const chatRef = doc(db, 'users', currentUser.uid, 'chats', chatId);
            await deleteDoc(chatRef);
            if (currentChatId === chatId) resetUI();
        } catch (error) { console.error("Error deleting:", error); }
    }

    function resetUI() {
        currentChatId = null;
        messagesWrapper.innerHTML = '';
        messagesWrapper.style.display = 'none';
        welcomeScreen.style.display = 'flex';
        if (messageUnsubscribe) messageUnsubscribe();
    }

    // --- Settings Management ---
    function loadSettings() {
        const settings = JSON.parse(localStorage.getItem('ai_lab_settings')) || { 
            imageStyle: 'pro',
            aspectRatio: '1:1',
            resolution: '4K',
            model: 'diffusion-4k'
        };
        if (imageStyleSelect) imageStyleSelect.value = settings.imageStyle || 'pro';
        if (aspectRatioSelect) aspectRatioSelect.value = settings.aspectRatio || '1:1';
        if (resolutionSelect) resolutionSelect.value = settings.resolution || '4K';
        if (imageModelSelect) imageModelSelect.value = settings.model || 'diffusion-4k';
        return settings;
    }

    function saveSettings() {
        const settings = {
            imageStyle: imageStyleSelect.value,
            aspectRatio: aspectRatioSelect.value,
            resolution: resolutionSelect.value,
            model: imageModelSelect.value
        };
        localStorage.setItem('ai_lab_settings', JSON.stringify(settings));
        showToast("Settings updated!", "info");
    }

    [imageStyleSelect, aspectRatioSelect, resolutionSelect, imageModelSelect].forEach(el => {
        if (el) el.addEventListener('change', saveSettings);
    });
    
    loadSettings();

    // --- Generation Logic ---
    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;
        if (!currentUser) {
            alert("Please log in first!");
            return;
        }
        chatInput.value = '';
        chatInput.style.height = 'auto';
        sendBtn.setAttribute('disabled', 'true');
        try {
            if (!currentChatId) {
                const chatsRef = collection(db, 'users', currentUser.uid, 'chats');
                const newChatDoc = await addDoc(chatsRef, {
                    title: text.substring(0, 30) + (text.length > 30 ? '...' : ''),
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
                currentChatId = newChatDoc.id;
                selectChat(currentChatId);
            }
            await saveMessageToDB('user', text);
        } catch (error) {
            console.error("Firebase Error:", error);
            sendBtn.removeAttribute('disabled');
            return;
        }
        const skeletonDiv = appendMessage('bot', '', true);
        handleImageGeneration(text, skeletonDiv);
    }

    async function handleImageGeneration(prompt, skeletonDiv) {
        try {
            const settings = loadSettings();
            let cleanPrompt = prompt.replace(/generate an image of|draw a picture of|create/gi, '').trim();
            
            // Build style wrapper
            let styleWrapper = "";
            if (settings.imageStyle === 'pro') {
                styleWrapper = `hyper-realistic 8K image of ${cleanPrompt}. ultra-detailed, photorealistic, cinematic lighting, masterpiece, sharp focus, 8k uhd`;
            } else if (settings.imageStyle === 'anime') {
                styleWrapper = `vibrant anime style illustration of ${cleanPrompt}. high quality digital art, studio ghibli style, colorful, aesthetic, 4k`;
            } else if (settings.imageStyle === 'cinematic') {
                styleWrapper = `cinematic 3D render of ${cleanPrompt}. unreal engine 5, octane render, moody lighting, highly detailed, photorealistic, 8k`;
            } else if (settings.imageStyle === 'artistic') {
                styleWrapper = `expressive oil painting of ${cleanPrompt}. textured brushstrokes, fine art, rich colors, artistic masterpiece`;
            } else {
                styleWrapper = `high quality image of ${cleanPrompt}. 4k resolution, clear and detailed`;
            }

            // Get parameters from settings
            const aspect = settings.aspectRatio;
            const resolution = settings.resolution;
            const model = settings.model;

            const imageUrl = `${API_BASE_URL}/api/proxy/image?prompt=${encodeURIComponent(styleWrapper)}&aspect_ratio=${aspect}&resolution=${resolution}&model=${model}`;
            
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = imageUrl;
            img.onload = async () => {
                if (skeletonDiv) skeletonDiv.remove();
                const replyText = `**Prompt:** ${cleanPrompt}\n**Style:** ${settings.imageStyle} | **Ratio:** ${aspect} | **Res:** ${resolution}`;
                appendMessage('bot', replyText, false, new Date(), imageUrl, 'image/png');
                await saveMessageToDB('bot', replyText, imageUrl, 'image/png');
                showToast("Image ready!");
                sendBtn.removeAttribute('disabled');
            };
            img.onerror = () => {
                if (skeletonDiv) skeletonDiv.remove();
                appendMessage('bot', "Generation failed. Please try a different prompt or setting.");
                sendBtn.removeAttribute('disabled');
            };
        } catch (error) {
            console.error("Image Gen Error:", error);
            if (skeletonDiv) skeletonDiv.remove();
            sendBtn.removeAttribute('disabled');
        }
    }

    async function saveMessageToDB(sender, text, fileUrl = null, fileType = null) {
        if (!currentUser || !currentChatId) return;
        try {
            const messagesRef = collection(db, 'users', currentUser.uid, 'chats', currentChatId, 'messages');
            await addDoc(messagesRef, {
                sender: sender, text: text, fileUrl: fileUrl, fileType: fileType, timestamp: serverTimestamp()
            });
            const chatRef = doc(db, 'users', currentUser.uid, 'chats', currentChatId);
            await updateDoc(chatRef, { updatedAt: serverTimestamp() });
        } catch (error) { console.error("Error saving message:", error); }
    }

    // --- UI Helpers ---
    function appendMessage(sender, text, isSkeleton = false, date = new Date(), fileUrl = null, fileType = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        let avatarContent = sender === 'user' 
            ? (currentUser?.photoURL ? `<img src="${currentUser.photoURL}" alt="U" style="width:100%; height:100%; border-radius:4px;">` : 'U')
            : '<i class="fa-solid fa-wand-magic-sparkles"></i>';
        const senderName = sender === 'user' ? (currentUser?.displayName?.split(' ')[0] || 'User') : 'ChandraXImage';
        const timeStr = date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...';
        
        let mediaContent = '';
        if (fileUrl && fileType?.startsWith('image/')) {
            mediaContent = `
                <div class="message-media" style="margin-top: 10px;">
                    <img src="${fileUrl}" id="img-${Date.now()}" alt="AI Image" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); display: block;" crossOrigin="anonymous">
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
                    ${isSkeleton ? '<div class="skeleton-line medium"></div><div class="skeleton-line"></div>' : formatText(text)}
                </div>
                ${mediaContent}
            </div>
        `;
        messagesWrapper.appendChild(messageDiv);
        scrollToBottom();
        return messageDiv;
    }

    function formatText(text) {
        return typeof marked !== 'undefined' ? marked.parse(text) : text.replace(/\n/g, '<br>');
    }

    function scrollToBottom() { chatContainer.scrollTop = chatContainer.scrollHeight; }

    function showToast(message, type = "success") {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fa-solid fa-circle-check"></i><span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
    }

    window.downloadFromDOM = (btn) => {
        try {
            const mediaDiv = btn.closest('.message-media');
            const img = mediaDiv.querySelector('img');
            if (!img) throw new Error("Image not found");

            showToast("Processing high-res image...", "info");
            
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
                URL.revokeObjectURL(url);
                showToast("Download successful!");
            }, 'image/png');
        } catch (error) {
            console.error("DOM Download failed:", error);
            showToast("Download failed. Please try again.", "error");
        }
    };

    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        themeToggleBtn.querySelector('i').className = isLight ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    });

    sidebarOverlay.addEventListener('click', () => { sidebar.classList.remove('open'); sidebarOverlay.style.display = 'none'; });
    mobileMenuBtn.addEventListener('click', () => { sidebar.classList.add('open'); sidebarOverlay.style.display = 'block'; });

    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
        sendBtn.disabled = !this.value.trim();
    });

    chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    sendBtn.addEventListener('click', sendMessage);
    
    document.querySelectorAll('.suggestion-card').forEach(card => {
        card.addEventListener('click', () => {
            chatInput.value = card.querySelector('p').innerText + " " + card.querySelector('.subtext').innerText;
            sendMessage();
        });
    });
});
