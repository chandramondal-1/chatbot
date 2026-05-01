const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors()); // Allow all origins for simplicity in this dev phase
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
        // Default to a high-end NVIDIA model
        let apiModel = (model === "nvidia" || !model || model === "helpful") ? "meta/llama-3.1-405b-instruct" : model;

        if (model === 'claude') {
            apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
            apiKey = process.env.OPENROUTER_API_KEY;
            apiModel = 'anthropic/claude-3.5-sonnet';
        } else if (model === 'deepseek') {
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
        const { prompt, aspect_ratio, resolution, model } = req.query;
        
        const apiKey = process.env.POLLINATIONS_API_KEY;
        if (!apiKey) {
            console.error("POLLINATIONS_API_KEY is missing");
            return res.status(500).json({ error: "POLLINATIONS_API_KEY is missing in .env" });
        }

        // Map aspect ratio to width/height for Pollinations
        let width = 1024;
        let height = 1024;

        if (aspect_ratio === '16:9') { width = 1344; height = 768; }
        else if (aspect_ratio === '9:16') { width = 768; height = 1344; }
        else if (aspect_ratio === '4:3') { width = 1248; height = 936; }
        else if (aspect_ratio === '3:4') { width = 936; height = 1248; }
        else if (aspect_ratio === '21:9') { width = 1536; height = 640; }

        // Boost resolution if 2K or 4K requested (Pollinations supports large sizes)
        if (resolution === '4K') {
            width = Math.min(width * 2, 2048); // Pollinations cap is around 2048
            height = Math.min(height * 2, 2048);
        } else if (resolution === '2K') {
            width = Math.min(Math.round(width * 1.5), 2048);
            height = Math.min(Math.round(height * 1.5), 2048);
        }

        // Determine model for Pollinations
        // Default to 'flux' as it's the highest quality available currently
        let pollinationsModel = 'flux'; 
        
        // If Nano Banana is requested (via resolution or specific setting)
        if (resolution === '4K' || resolution === '2K' || model === 'nanobanana-pro') {
            pollinationsModel = 'nanobanana-pro';
        } else if (model === 'flux-pro') {
            pollinationsModel = 'flux';
        }

        const pollinationsUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?width=${width}&height=${height}&model=${pollinationsModel}&seed=${Math.floor(Math.random() * 1000000)}&nologo=true&enhance=true`;
        
        console.log(`Generating image with ${pollinationsModel} via Pollinations...`);

        const response = await fetch(pollinationsUrl, {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Pollinations Image Error:", response.status, errorText);
            return res.status(response.status).send(errorText);
        }

        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/png';
        
        res.setHeader('Content-Type', contentType);
        res.send(Buffer.from(buffer));

    } catch (error) {
        console.error("Image Generation Error:", error);
        res.status(500).send("Error generating image: " + error.message);
    }
});

// Proxy for Pollinations Audio Generation (to hide Secret Key)
app.get('/api/proxy/audio', async (req, res) => {
    try {
        const { text, voice } = req.query;
        const audioUrl = `https://gen.pollinations.ai/audio/${encodeURIComponent(text)}?voice=${voice || 'nova'}`;
        
        console.log("Fetching audio from:", audioUrl);
        const response = await fetch(audioUrl);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Pollinations Audio Error:", response.status, errorText);
            return res.status(response.status).send(errorText);
        }

        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'audio/mpeg';
        
        res.setHeader('Content-Type', contentType);
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error("Audio Proxy Error:", error);
        res.status(500).send("Error generating audio: " + error.message);
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`NVIDIA API Key: ${process.env.NVIDIA_API_KEY ? 'Loaded' : 'Missing'}`);
    console.log(`Pollinations API Key: ${process.env.POLLINATIONS_API_KEY ? 'Loaded' : 'Missing'}`);
    console.log(`OpenRouter API Key: ${process.env.OPENROUTER_API_KEY ? 'Loaded' : 'Missing'}`);
});
