// --- Firebase Modular Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { 
    getFirestore, collection, addDoc, getDocs, query, orderBy, 
    serverTimestamp, onSnapshot, doc, deleteDoc, setDoc, updateDoc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// ==========================================
// 🔴 CONFIGURATION 🔴
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyDANJ-7C4CNHCOsrUGpZL6mN3bJg71nIVo",
  authDomain: "chatbot-20954.firebaseapp.com",
  projectId: "chatbot-20954",
  storageBucket: "chatbot-20954.firebasestorage.app",
  messagingSenderId: "196542676864",
  appId: "1:196542676864:web:9039292a8a542cdaaf8b65"
};

// Removed API key for security (using free CORS-friendly AI now)

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
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
    const suggestionCards = document.querySelectorAll('.suggestion-card');
    const newChatBtn = document.querySelector('.new-chat-btn');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const modelSelect = document.querySelector('.model-selector select');
    
    // Auth Elements
    const authBtn = document.getElementById('auth-btn');
    const authText = document.getElementById('auth-text');
    const authIcon = document.getElementById('auth-icon');
    const historyList = document.getElementById('history-list');

    // --- Authentication Logic ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            authText.textContent = `Log Out (${user.displayName.split(' ')[0]})`;
            authIcon.className = 'fa-solid fa-arrow-right-from-bracket';
            subscribeToChatList();
        } else {
            currentUser = null;
            authText.textContent = 'Log In with Google';
            authIcon.className = 'fa-brands fa-google';
            historyList.innerHTML = '<li class="history-item"><div class="history-content"><span class="history-title">Log in to save history</span></div></li>';
            if (chatListUnsubscribe) chatListUnsubscribe();
            resetUI();
        }
    });

    authBtn.addEventListener('click', async () => {
        if (currentUser) {
            try {
                await signOut(auth);
            } catch (error) {
                console.error("Error signing out:", error);
            }
        } else {
            try {
                await signInWithPopup(auth, provider);
            } catch (error) {
                console.error("Firebase Auth Error:", error.code, error.message);
                alert("Authentication failed: " + error.message + "\n\nTip: Make sure you added 'chandramondal-1.github.io' to Authorized Domains in Firebase Console.");
            }
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
                historyList.innerHTML = '<li class="history-item"><div class="history-content"><span class="history-title">No chats yet</span></div></li>';
                return;
            }
            
            snapshot.forEach((doc) => {
                const chatData = doc.data();
                const chatId = doc.id;
                const li = document.createElement('li');
                li.className = `history-item ${currentChatId === chatId ? 'active' : ''}`;
                li.dataset.id = chatId;
                
                li.innerHTML = `
                    <div class="history-content">
                        <i class="fa-regular fa-message"></i>
                        <span class="history-title">${chatData.title || 'New Chat'}</span>
                    </div>
                    <div class="history-actions">
                        <button class="action-btn rename-chat" title="Rename"><i class="fa-solid fa-pen"></i></button>
                        <button class="action-btn delete-chat delete" title="Delete"><i class="fa-solid fa-trash"></i></button>
                    </div>
                `;
                
                li.addEventListener('click', (e) => {
                    if (e.target.closest('.history-actions')) return;
                    selectChat(chatId);
                });
                
                li.querySelector('.delete-chat').addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteChat(chatId);
                });

                li.querySelector('.rename-chat').addEventListener('click', (e) => {
                    e.stopPropagation();
                    renameChat(chatId, chatData.title);
                });
                
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
                appendMessage(msg.sender, msg.text, false, msg.timestamp?.toDate());
            });
            scrollToBottom();
        });
        
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
    }

    async function deleteChat(chatId) {
        if (!confirm("Are you sure you want to delete this chat?")) return;
        try {
            const chatRef = doc(db, 'users', currentUser.uid, 'chats', chatId);
            await deleteDoc(chatRef);
            if (currentChatId === chatId) {
                resetUI();
            }
        } catch (error) {
            console.error("Error deleting chat:", error);
        }
    }

    async function renameChat(chatId, currentTitle) {
        const newTitle = prompt("Enter new chat title:", currentTitle);
        if (!newTitle || newTitle === currentTitle) return;
        try {
            const chatRef = doc(db, 'users', currentUser.uid, 'chats', chatId);
            await updateDoc(chatRef, { title: newTitle });
        } catch (error) {
            console.error("Error renaming chat:", error);
        }
    }

    function resetUI() {
        currentChatId = null;
        messagesWrapper.innerHTML = '';
        messagesWrapper.style.display = 'none';
        welcomeScreen.style.display = 'flex';
        if (messageUnsubscribe) messageUnsubscribe();
    }

    // --- Message Logic ---
    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        if (!currentUser) {
            alert("Please log in to chat!");
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
            alert("Error sending message! Please check your Firebase Firestore rules. They might be blocking read/write access. \n\nMake sure you have created a Firestore Database in test mode.");
            sendBtn.removeAttribute('disabled');
            chatInput.value = text;
            return;
        }
        
        getAIResponse(text);
    }

    async function getAIResponse(userText) {
        const skeletonDiv = appendMessage('bot', '', true);
        scrollToBottom();

        try {
            // Since this is GitHub Pages, we use a free, CORS-friendly AI API (Pollinations AI)
            // This prevents API key leakage and bypasses CORS security blocks!
            const response = await fetch('https://text.pollinations.ai/', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    messages: [
                        { role: 'system', content: 'You are a helpful and intelligent AI assistant.' },
                        { role: 'user', content: userText }
                    ]
                })
            });

            const replyText = await response.text();
            skeletonDiv.remove();

            if (!response.ok) {
                appendMessage('bot', "AI Error: Something went wrong.");
            } else {
                await saveMessageToDB('bot', replyText);
            }
        } catch (error) {
            console.error("API Error:", error);
            skeletonDiv.remove();
            appendMessage('bot', "Sorry, I'm having trouble connecting to the AI. Check your internet connection.");
        }
        scrollToBottom();
    }

    async function saveMessageToDB(sender, text) {
        if (!currentUser || !currentChatId) return;
        try {
            const messagesRef = collection(db, 'users', currentUser.uid, 'chats', currentChatId, 'messages');
            await addDoc(messagesRef, {
                sender: sender,
                text: text,
                timestamp: serverTimestamp()
            });
            
            const chatRef = doc(db, 'users', currentUser.uid, 'chats', currentChatId);
            await updateDoc(chatRef, { updatedAt: serverTimestamp() });
        } catch (error) {
            console.error("Error saving message:", error);
        }
    }

    // --- UI Helpers ---
    function appendMessage(sender, text, isSkeleton = false, date = new Date()) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;

        let avatarContent = '';
        let senderName = '';
        
        if (sender === 'user') {
            if (currentUser && currentUser.photoURL) {
                avatarContent = `<img src="${currentUser.photoURL}" alt="User" style="width:100%; height:100%; border-radius:4px;">`;
            } else {
                avatarContent = 'U';
            }
            senderName = currentUser ? currentUser.displayName.split(' ')[0] : 'You';
        } else {
            avatarContent = '<i class="fa-solid fa-robot"></i>';
            senderName = 'AI Assistant';
        }

        const timeStr = date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...';

        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="avatar ${sender}">${avatarContent}</div>
                <div class="message-body">
                    <div class="message-header">
                        <span class="sender-name">${senderName}</span>
                        <span class="message-time">${timeStr}</span>
                    </div>
                    <div class="message-text">
                        ${isSkeleton ? `
                            <div class="skeleton-loader">
                                <div class="skeleton-line medium"></div>
                                <div class="skeleton-line"></div>
                            </div>
                        ` : formatText(text)}
                    </div>
                    ${!isSkeleton && sender === 'bot' ? `
                        <div class="message-actions">
                            <button class="msg-action-btn copy-btn" title="Copy"><i class="fa-regular fa-copy"></i></button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        messagesWrapper.appendChild(messageDiv);
        
        if (!isSkeleton && sender === 'bot') {
            const copyBtn = messageDiv.querySelector('.copy-btn');
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(text);
                copyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
                setTimeout(() => copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>', 2000);
            });
        }
        
        return messageDiv;
    }

    function formatText(text) {
        let html = text.replace(/```(\w*)\n([\s\S]*?)```/g, (m, lang, code) => {
            return `<div class="code-block-wrapper">
                <div class="code-header"><span>${lang || 'code'}</span><button class="copy-code-btn"><i class="fa-regular fa-copy"></i> Copy</button></div>
                <pre><code>${escapeHTML(code.trim())}</code></pre>
            </div>`;
        });
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        return html.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, tag => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[tag] || tag));
    }

    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const icon = themeToggleBtn.querySelector('i');
        const isLight = document.body.classList.contains('light-mode');
        icon.className = isLight ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        themeToggleBtn.querySelector('span').textContent = isLight ? 'Light Mode' : 'Dark Mode';
    });

    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('active');
    });

    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
    });

    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
        sendBtn.disabled = !this.value.trim();
    });

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    sendBtn.addEventListener('click', sendMessage);

    suggestionCards.forEach(card => {
        card.addEventListener('click', () => {
            chatInput.value = card.querySelector('strong').innerText + " " + card.querySelector('.subtext').innerText;
            sendMessage();
        });
    });

    newChatBtn.addEventListener('click', () => {
        resetUI();
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
    });
});
