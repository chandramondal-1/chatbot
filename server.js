const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// API Endpoint for Chat
app.post('/api/chat', async (req, res) => {
    try {
        const { message, model } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        // We'll use OpenRouter as the default provider since the user provided an OpenRouter key.
        // It's the most flexible for multiple models.
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "HTTP-Referer": "http://localhost:3000", // Optional, for OpenRouter rankings
                "X-Title": "AI Chatbot UI", // Optional
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": model || "google/gemini-2.0-flash-001", // Default model
                "messages": [
                    { "role": "user", "content": message }
                ],
            })
        });

        const data = await response.json();
        
        if (data.error) {
            console.error("OpenRouter Error:", data.error);
            return res.status(500).json({ error: data.error.message || "AI API Error" });
        }

        const botReply = data.choices[0].message.content;
        res.json({ reply: botReply });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API Keys loaded: ${process.env.OPENROUTER_API_KEY ? 'Yes' : 'No'}`);
});
