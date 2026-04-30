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

        // Use NVIDIA API since the previous API keys were out of credits
        const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": model || "meta/llama-3.1-70b-instruct", // Default model
                "messages": [
                    { "role": "user", "content": message }
                ],
            })
        });

        const data = await response.json();
        
        if (data.error) {
            console.error("NVIDIA API Error:", data.error);
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
    console.log(`API Keys loaded: ${process.env.NVIDIA_API_KEY ? 'Yes' : 'No'}`);
});
