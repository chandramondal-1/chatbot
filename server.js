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
        const { messages, model } = req.body;
        
        if (!messages || !messages.length) {
            return res.status(400).json({ error: "Messages are required" });
        }

        let apiUrl = "https://integrate.api.nvidia.com/v1/chat/completions";
        let apiKey = process.env.NVIDIA_API_KEY;
        let apiModel = model || "nvidia/llama-3.1-8b-instruct";

        if (model === 'deepseek') {
            apiUrl = 'https://api.deepseek.com/chat/completions';
            apiKey = process.env.DEEPSEEK_API_KEY;
            apiModel = 'deepseek-chat';
        } else if (model === 'kimi') {
            apiUrl = 'https://api.moonshot.cn/v1/chat/completions';
            apiKey = process.env.KIMI_API_KEY;
            apiModel = 'moonshot-v1-8k';
        } else if (model === 'openrouter') {
            apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
            apiKey = process.env.OPENROUTER_API_KEY;
            apiModel = 'meta-llama/llama-3.1-8b-instruct:free';
        }

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": apiModel,
                "messages": messages,
            })
        });

        const data = await response.json();
        
        if (data.error) {
            console.error("AI API Error:", data.error);
            return res.status(500).json({ error: data.error.message || "AI API Error" });
        }

        res.json(data);

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Proxy for Pollinations Image Generation (to hide Secret Key)
app.get('/api/proxy/image', async (req, res) => {
    try {
        const { prompt, width, height, model, negative, seed } = req.query;
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width || 1024}&height=${height || 1024}&nologo=true&enhance=true&model=${model || 'flux'}&negative=${encodeURIComponent(negative || '')}&seed=${seed || Math.floor(Math.random() * 1000000)}&key=${process.env.POLLINATIONS_API_KEY}`;
        
        const response = await fetch(imageUrl);
        const buffer = await response.arrayBuffer();
        
        res.setHeader('Content-Type', 'image/png');
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error("Image Proxy Error:", error);
        res.status(500).send("Error generating image");
    }
});

// Proxy for Pollinations Audio Generation (to hide Secret Key)
app.get('/api/proxy/audio', async (req, res) => {
    try {
        const { text, voice } = req.query;
        const audioUrl = `https://gen.pollinations.ai/audio/${encodeURIComponent(text)}?voice=${voice || 'nova'}&key=${process.env.POLLINATIONS_API_KEY}`;
        
        const response = await fetch(audioUrl);
        const buffer = await response.arrayBuffer();
        
        res.setHeader('Content-Type', 'audio/mpeg');
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error("Audio Proxy Error:", error);
        res.status(500).send("Error generating audio");
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API Keys loaded: ${process.env.NVIDIA_API_KEY ? 'Yes' : 'No'}`);
    console.log(`Pollinations Key loaded: ${process.env.POLLINATIONS_API_KEY ? 'Yes' : 'No'}`);
});
