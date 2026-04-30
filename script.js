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

// (API keys are now handled securely on the server-side in server.js)


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
    const suggestionCards = document.querySelectorAll('.suggestion-card');
    const newChatBtn = document.querySelector('.new-chat-btn');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const voiceBtn = document.getElementById('voice-btn');
    const inputContainer = document.querySelector('.input-container');
    const toastContainer = document.getElementById('toast-container');
    const stopSpeakBtn = document.getElementById('stop-speak-btn');
    const imageStyleSelect = document.getElementById('image-style-select');
    const textModeSelect = document.getElementById('text-mode-select');
    const voiceSelect = document.getElementById('voice-select');
    const modeBtns = document.querySelectorAll('.mode-pill');
    let currentAppMode = 'text'; // Default mode
    const modelSelect = document.querySelector('.model-selector select');
    
    // Auth Elements
    const authBtn = document.getElementById('auth-btn');
    const authText = document.getElementById('auth-text');
    const historyList = document.getElementById('history-list');
    const fileInput = document.getElementById('file-input');
    const attachBtn = document.getElementById('attach-btn');

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
                    <i class="fa-regular fa-message" style="margin-right: 0.75rem; font-size: 0.8rem;"></i>
                    <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${chatData.title || 'New Chat'}</span>
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
                appendMessage(msg.sender, msg.text, false, msg.timestamp?.toDate(), msg.fileUrl, msg.fileType);
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

    // --- Settings Persistence ---
    function loadSettings() {
        const settings = JSON.parse(localStorage.getItem('ai_lab_settings')) || {
            imageStyle: 'pro',
            textMode: 'helpful',
            voice: 'nova'
        };
        imageStyleSelect.value = settings.imageStyle;
        textModeSelect.value = settings.textMode;
        voiceSelect.value = settings.voice;
        return settings;
    }

    function saveSettings() {
        const settings = {
            imageStyle: imageStyleSelect.value,
            textMode: textModeSelect.value,
            voice: voiceSelect.value
        };
        localStorage.setItem('ai_lab_settings', JSON.stringify(settings));
        showToast("Settings updated!", "info");
    }

    imageStyleSelect.addEventListener('change', saveSettings);
    textModeSelect.addEventListener('change', saveSettings);
    voiceSelect.addEventListener('change', saveSettings);

    const currentSettings = loadSettings();

    // --- Mode Selector Logic ---
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentAppMode = btn.dataset.mode;
            
            // Update input placeholder based on mode
            if (currentAppMode === 'image') {
                chatInput.placeholder = "Describe the image...";
            } else if (currentAppMode === 'voice') {
                chatInput.placeholder = "Type to speak...";
            } else {
                chatInput.placeholder = "Message ChatGPT...";
            }
        });
    });

    // --- Firebase Auth ---
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
        
        // Route based on selected mode
        if (currentAppMode === 'image') {
            const skeletonDiv = appendMessage('bot', '', true);
            handleImageGeneration(text, skeletonDiv);
        } else if (currentAppMode === 'voice') {
            const skeletonDiv = appendMessage('bot', '', true);
            handleVoiceGeneration(text, skeletonDiv);
        } else {
            getAIResponse(text);
        }
    }

    async function handleFileUpload(file) {
        if (!currentUser || !currentChatId) {
            alert("Please start a chat or log in first!");
            return;
        }

        const skeletonDiv = appendMessage('bot', "Uploading file...", true);
        scrollToBottom();

        try {
            const fileRef = ref(storage, `users/${currentUser.uid}/chats/${currentChatId}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(fileRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            skeletonDiv.remove();
            
            await saveMessageToDB('user', `Uploaded a file: ${file.name}`, downloadURL, file.type);
            
            // If it's an image, use Vision capability
            if (file.type.startsWith('image/')) {
                getAIResponse(`I have uploaded an image: ${file.name}. Please describe it or wait for my instructions.`, downloadURL);
            } else {
                getAIResponse(`I have uploaded a document: ${file.name}. Please acknowledge it.`);
            }
        } catch (error) {
            console.error("Upload error:", error);
            skeletonDiv.remove();
            alert("Failed to upload file. Make sure you have enabled Firebase Storage in your console.");
        }
    }

    async function getAIResponse(userText, mediaUrl = null) {
        const skeletonDiv = appendMessage('bot', '', true);
        scrollToBottom();

        const settings = loadSettings();
        let systemPrompt = 'You are Chandra AI, a highly advanced multimodal assistant created by CHANDRA MONDAL. You are helpful, creative, and professional. You can see images if a URL is provided.';
        
        if (settings.textMode === 'creative') {
            systemPrompt = 'You are a master storyteller and creative writer created by CHANDRA MONDAL. Be poetic and imaginative.';
        } else if (settings.textMode === 'coder') {
            systemPrompt = 'You are Chandra AI, an expert software engineer created by CHANDRA MONDAL. Provide clean, optimized code and technical depth.';
        }

        const codingKeywords = ['code', 'function', 'script', 'programming', 'javascript', 'python', 'html', 'css', 'bug', 'debug', 'write a', 'create a'];
        const isImage = /image|picture|photo|draw|create.*img|generate.*img|sketch|paint/i.test(userText);
        const isCoding = codingKeywords.some(keyword => userText.toLowerCase().includes(keyword));

        if (isImage) {
            handleImageGeneration(userText, skeletonDiv);
            return;
        }

        const modelType = isCoding ? 'deepseek' : 'nvidia';

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelType,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: mediaUrl ? [
                            { type: 'text', text: userText },
                            { type: 'image_url', image_url: { url: mediaUrl } }
                        ] : userText }
                    ]
                })
            });

            if (!response.ok) throw new Error("Server Response Error");

            const data = await response.json();
            const replyText = data.choices[0].message.content;

            skeletonDiv.remove();
            await saveMessageToDB('bot', replyText);
        } catch (error) {
            console.error("API Error:", error);
            skeletonDiv.remove();
            appendMessage('bot', "Sorry, I'm having trouble connecting to the AI service. Please check your connection.");
        }
        sendBtn.removeAttribute('disabled');
        scrollToBottom();
    }

    async function handleVoiceGeneration(prompt, skeletonDiv) {
        try {
            const settings = loadSettings();
            const cleanText = prompt.substring(0, 1000);
            const audioUrl = `/api/proxy/audio?text=${encodeURIComponent(cleanText)}&voice=${settings.voice}`;
            
            skeletonDiv.remove();
            const replyText = `I have generated a voice note for your text: "${cleanText.substring(0, 50)}..."`;
            
            // Append as a playable audio message
            const messageDiv = appendMessage('bot', replyText);
            const mediaWrapper = document.createElement('div');
            mediaWrapper.className = 'message-media';
            mediaWrapper.style.marginTop = '12px';
            mediaWrapper.innerHTML = `
                <audio controls src="${audioUrl}" style="width: 100%; border-radius: 12px;"></audio>
                <button onclick="downloadMedia('${audioUrl}', 'ai-voice-${Date.now()}.mp3')" class="msg-action-btn" style="margin-top: 10px; border-color: #ffd700; color: #ffd700;">
                    <i class="fa-solid fa-download"></i> Download Voice Note
                </button>
            `;
            messageDiv.querySelector('.message-body').appendChild(mediaWrapper);
            
            await saveMessageToDB('bot', replyText, audioUrl, 'audio/mpeg');
            showToast("Voice generated!", "success");

        } catch (error) {
            console.error("Voice Gen Error:", error);
            skeletonDiv.remove();
            appendMessage('bot', "Sorry, I couldn't generate that voice note.");
        }
        sendBtn.removeAttribute('disabled');
    }

    async function handleImageGeneration(prompt, skeletonDiv) {
        try {
            const settings = loadSettings();
            let cleanPrompt = prompt.replace(/generate an image of|generate image of|draw a picture of|draw a|create a picture of|create an image of/gi, '').trim();
            
            let styleWrapper = "";
            let negativePrompt = "(deformed, distorted, disfigured:1.3), poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, (mutated hands and fingers:1.4), disconnected limbs, mutation, mutated, ugly, disgusting, blurry, amputation";

            if (settings.imageStyle === 'pro') {
                styleWrapper = `hyper-realistic 8K image of ${cleanPrompt}. ultra-detailed, lifelike, high-resolution, sharp, vibrant colors, photorealistic, cinematic lighting, masterpiece, sharp focus, volumetric lighting, 8k uhd`;
            } else if (settings.imageStyle === 'anime') {
                styleWrapper = `vibrant anime style illustration of ${cleanPrompt}. high quality digital art, studio ghibli style, sharp lines, colorful, aesthetic, 4k`;
            } else if (settings.imageStyle === 'cinematic') {
                styleWrapper = `cinematic 3D render of ${cleanPrompt}. unreal engine 5, octane render, volumetric fog, moody lighting, highly detailed, photorealistic, 8k`;
            } else {
                styleWrapper = `high quality image of ${cleanPrompt}. 4k resolution, clear, bright`;
            }

            const imageUrl = `/api/proxy/image?prompt=${encodeURIComponent(styleWrapper)}&width=1024&height=1024&model=flux&negative=${encodeURIComponent(negativePrompt)}&seed=${Math.floor(Math.random() * 1000000)}`;
            
            const img = new Image();
            img.src = imageUrl;
            
            img.onload = async () => {
                skeletonDiv.remove();
                const replyText = `Here is the image I generated for: **${cleanPrompt}**`;
                await saveMessageToDB('bot', replyText, imageUrl, 'image/png');
                showToast("Image generated successfully!");
                sendBtn.removeAttribute('disabled');
            };
            
            img.onerror = () => {
                sendBtn.removeAttribute('disabled');
                throw new Error("Image failed to load");
            };

        } catch (error) {
            console.error("Image Gen Error:", error);
            skeletonDiv.remove();
            appendMessage('bot', "Sorry, I couldn't generate that image right now.");
            sendBtn.removeAttribute('disabled');
        }
    }

    async function saveMessageToDB(sender, text, fileUrl = null, fileType = null) {
        if (!currentUser || !currentChatId) return;
        try {
            const messagesRef = collection(db, 'users', currentUser.uid, 'chats', currentChatId, 'messages');
            await addDoc(messagesRef, {
                sender: sender,
                text: text,
                fileUrl: fileUrl,
                fileType: fileType,
                timestamp: serverTimestamp()
            });
            
            const chatRef = doc(db, 'users', currentUser.uid, 'chats', currentChatId);
            await updateDoc(chatRef, { updatedAt: serverTimestamp() });
        } catch (error) {
            console.error("Error saving message:", error);
        }
    }

    // --- UI Helpers ---
    // --- Advanced Features ---

    // 1. Voice Input (Speech to Text)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        voiceBtn.addEventListener('click', () => {
            if (voiceBtn.classList.contains('listening')) {
                recognition.stop();
            } else {
                recognition.start();
                voiceBtn.classList.add('listening');
                showToast("Listening...", "info");
            }
        });

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            chatInput.value = transcript;
            voiceBtn.classList.remove('listening');
            sendMessage();
        };

        recognition.onerror = () => {
            voiceBtn.classList.remove('listening');
            showToast("Speech recognition failed.", "error");
        };

        recognition.onend = () => {
            voiceBtn.classList.remove('listening');
        };
    } else {
        voiceBtn.style.display = 'none';
    }

    // 2. Voice Output (Text to Speech - AI Powered)
    let currentAudio = null;

    async function speak(text) {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }

        const settings = loadSettings();
        const cleanText = text.replace(/[*#`_]/g, '').substring(0, 1000);
        
        // Using selected AI Voice
        const audioUrl = `/api/proxy/audio?text=${encodeURIComponent(cleanText)}&voice=${settings.voice}`;
        
        currentAudio = new Audio(audioUrl);
        
        currentAudio.onplay = () => {
            stopSpeakBtn.style.display = 'flex';
        };
        
        currentAudio.onended = () => {
            stopSpeakBtn.style.display = 'none';
            currentAudio = null;
        };

        currentAudio.onerror = () => {
            console.error("AI Voice failed, falling back to system voice.");
            const utterance = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(utterance);
        };

        currentAudio.play();
    }

    stopSpeakBtn.addEventListener('click', () => {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
        window.speechSynthesis.cancel();
        stopSpeakBtn.style.display = 'none';
        showToast("Speech stopped", "info");
    });

    // 3. Toast Notifications
    function showToast(message, type = "success") {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-info'}"></i><span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // 4. Drag and Drop
    inputContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        inputContainer.classList.add('drag-over');
    });

    inputContainer.addEventListener('dragleave', () => {
        inputContainer.classList.remove('drag-over');
    });

    inputContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        inputContainer.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    });

    // 5. Reactions Logic
    function handleReaction(btn, type) {
        const parent = btn.parentElement;
        parent.querySelectorAll('.msg-action-btn').forEach(b => b.style.color = '');
        btn.style.color = type === 'up' ? '#10a37f' : '#ff4d4d';
        showToast(`Feedback saved!`, "success");
    }

    function appendMessage(sender, text, isSkeleton = false, date = new Date(), fileUrl = null, fileType = null) {
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
            senderName = 'Chandra AI';
        }

        const timeStr = date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...';

        let mediaContent = '';
        if (fileUrl) {
            if (fileType && fileType.startsWith('image/')) {
                mediaContent = `
                    <div class="message-media" style="margin-top: 10px;">
                        <img src="${fileUrl}" alt="AI Image" style="max-width: 100%; border-radius: 12px; box-shadow: var(--shadow-md); display: block;">
                        <button onclick="downloadMedia('${fileUrl}', 'ai-image-${Date.now()}.png')" class="msg-action-btn" style="margin-top: 12px; background: var(--accent-gradient); color: white; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 600; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s;">
                            <i class="fa-solid fa-download"></i> Download Image
                        </button>
                    </div>`;
            } else {
                mediaContent = `<div class="message-media" style="margin-top: 8px;">
                    <a href="${fileUrl}" target="_blank" style="display: flex; align-items: center; gap: 8px; padding: 10px; background: var(--bg-tertiary); border-radius: 8px; text-decoration: none; color: var(--text-primary); border: 1px solid var(--border-color);">
                        <i class="fa-solid fa-file"></i>
                        <span>Download Attachment</span>
                    </a>
                </div>`;
            }
        }

        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="msg-avatar ${sender}">${avatarContent}</div>
                <div class="msg-body">
                    <div class="message-header">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="msg-sender">${senderName}</span>
                            <span class="message-time">${timeStr}</span>
                        </div>
                        ${!isSkeleton && sender === 'bot' ? `
                            <button class="msg-action-btn speak-btn" title="Listen"><i class="fa-solid fa-volume-high"></i></button>
                        ` : ''}
                    </div>
                    <div class="msg-text">
                        ${isSkeleton ? `
                            <div class="skeleton-line short"></div>
                            <div class="skeleton-line medium"></div>
                            <div class="skeleton-line"></div>
                        ` : formatText(text)}
                    </div>
                    ${mediaContent}
                    ${!isSkeleton && sender === 'bot' ? `
                        <div class="message-actions">
                            <div class="reaction-group">
                                <button class="msg-action-btn thumb-up" title="Helpful"><i class="fa-regular fa-thumbs-up"></i></button>
                                <button class="msg-action-btn thumb-down" title="Not helpful"><i class="fa-regular fa-thumbs-down"></i></button>
                            </div>
                            <button class="msg-action-btn copy-btn" title="Copy"><i class="fa-regular fa-copy"></i> Copy</button>
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
                copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied';
                showToast("Copied to clipboard!");
                setTimeout(() => copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy', 2000);
            });

            const speakBtn = messageDiv.querySelector('.speak-btn');
            speakBtn.addEventListener('click', () => speak(text));

            const upBtn = messageDiv.querySelector('.thumb-up');
            const downBtn = messageDiv.querySelector('.thumb-down');
            upBtn.addEventListener('click', () => handleReaction(upBtn, 'up'));
            downBtn.addEventListener('click', () => handleReaction(downBtn, 'down'));
            
            Prism.highlightAllUnder(messageDiv);
        }
        
        return messageDiv;
    }

    function formatText(text) {
        if (typeof marked !== 'undefined') {
            return marked.parse(text);
        }
        // Fallback if marked is not loaded
        return text.replace(/\n/g, '<br>');
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

    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        sidebarOverlay.style.display = 'none';
    });

    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
        sidebarOverlay.style.display = 'block';
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

    attachBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file);
        }
    });

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

    // Global helper for downloading media (especially cross-origin images)
    window.downloadMedia = async (url, filename) => {
        try {
            showToast("Starting download...", "info");
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
            showToast("Download complete!", "success");
        } catch (error) {
            console.error("Download failed:", error);
            showToast("Download failed. Opening in new tab...", "error");
            window.open(url, '_blank');
        }
    };
});
