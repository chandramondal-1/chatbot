document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const messagesWrapper = document.getElementById('messages-wrapper');
    const welcomeScreen = document.getElementById('welcome-screen');
    const chatContainer = document.getElementById('chat-container');
    const suggestionCards = document.querySelectorAll('.suggestion-card');
    const newChatBtn = document.querySelector('.new-chat-btn');

    // Auto-resize textarea
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        
        // Enable/disable send button based on input
        if (this.value.trim().length > 0) {
            sendBtn.removeAttribute('disabled');
        } else {
            sendBtn.setAttribute('disabled', 'true');
        }
    });

    // Handle initial state of send button
    sendBtn.setAttribute('disabled', 'true');

    // Handle Enter key to send message
    chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Handle Send button click
    sendBtn.addEventListener('click', sendMessage);

    // Handle suggestion clicks
    suggestionCards.forEach(card => {
        card.addEventListener('click', () => {
            const promptStrong = card.querySelector('strong').innerText;
            const promptSub = card.querySelector('.subtext').innerText;
            chatInput.value = `${promptStrong} ${promptSub}`;
            sendMessage();
        });
    });

    // Handle New Chat button
    newChatBtn.addEventListener('click', () => {
        messagesWrapper.innerHTML = '';
        messagesWrapper.style.display = 'none';
        welcomeScreen.style.display = 'flex';
        chatInput.value = '';
        chatInput.style.height = 'auto';
        sendBtn.setAttribute('disabled', 'true');
        chatInput.focus();
    });

    function sendMessage() {
        const messageText = chatInput.value.trim();
        if (messageText === '') return;

        // Hide welcome screen and show messages wrapper on first message
        if (welcomeScreen.style.display !== 'none') {
            welcomeScreen.style.display = 'none';
            messagesWrapper.style.display = 'flex';
        }

        // Add User Message
        appendMessage('user', messageText);

        // Clear input and reset height
        chatInput.value = '';
        chatInput.style.height = 'auto';
        sendBtn.setAttribute('disabled', 'true');

        // Scroll to bottom
        scrollToBottom();

        // Simulate Bot Response (To be replaced with real API later)
        simulateBotResponse(messageText);
    }

    function appendMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);

        const avatarIcon = sender === 'user' ? 'U' : '<i class="fa-solid fa-robot"></i>';

        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="avatar ${sender}">
                    ${avatarIcon}
                </div>
                <div class="message-text">
                    ${formatText(text)}
                </div>
            </div>
        `;

        messagesWrapper.appendChild(messageDiv);
    }

    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('message', 'bot');
        typingDiv.id = 'typing-indicator-msg';

        typingDiv.innerHTML = `
            <div class="message-content">
                <div class="avatar bot">
                    <i class="fa-solid fa-robot"></i>
                </div>
                <div class="message-text">
                    <div class="typing-indicator">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                </div>
            </div>
        `;

        messagesWrapper.appendChild(typingDiv);
        scrollToBottom();
        return typingDiv;
    }

    function simulateBotResponse(userMessage) {
        const typingIndicator = showTypingIndicator();

        // Simulate network delay
        setTimeout(() => {
            typingIndicator.remove();
            
            // Dummy logic for UI demonstration
            let botReply = "This is a simulated response. Later, you will integrate an API here (like OpenAI or Google Gemini) to get real responses.";
            
            if (userMessage.toLowerCase().includes('hello')) {
                botReply = "Hello there! How can I assist you today?";
            } else if (userMessage.toLowerCase().includes('code')) {
                botReply = "Sure! Here is a simple example of a JavaScript function:\n\n```javascript\nfunction greet(name) {\n    return `Hello, ${name}!`;\n}\nconsole.log(greet('World'));\n```\n\nYou can ask me to write more specific code later!";
            }

            appendMessage('bot', botReply);
            scrollToBottom();
        }, 1500);
    }

    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // Simple markdown formatting (bold and code blocks) for the UI demo
    function formatText(text) {
        // Simple code block formatting
        let formattedText = text.replace(/```([\s\S]*?)```/g, '<pre style="background: var(--bg-primary); padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin: 1rem 0; border: 1px solid var(--border-color);"><code>$1</code></pre>');
        
        // Simple line breaks
        formattedText = formattedText.replace(/\n/g, '<br>');
        return formattedText;
    }
});
