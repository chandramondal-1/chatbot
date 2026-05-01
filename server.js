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
        const { prompt, aspect_ratio, resolution } = req.query;
        
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: "OPENROUTER_API_KEY is missing in .env" });
        }

        // Use 4KAgent (Nano Banana) models via OpenRouter
        let apiModel = (resolution === '2K' || resolution === '4K') 
            ? 'google/gemini-3-pro-image-preview' 
            : 'google/gemini-3.1-flash-image-preview';
        
        if (req.query.model === 'flux-pro') {
            apiModel = 'black-forest-labs/flux-pro-1.1';
        }

        console.log(`Generating image with ${apiModel} (4K Agent via OpenRouter)...`);

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://github.com/taco-group/4KAgent', // Reference to the 4KAgent project
                'X-Title': '4K Agent Assistant'
            },
            body: JSON.stringify({
                model: apiModel,
                messages: [{ role: 'user', content: prompt }],
                generation_config: {
                    image_config: {
                        aspect_ratio: aspect_ratio || "1:1",
                        image_size: resolution || "1K"
                    }
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("OpenRouter Image Error:", data);
            return res.status(response.status).json(data);
        }

        // OpenRouter returns images in an array within the message object
        const imageObj = data.choices?.[0]?.message?.images?.[0];
        const imageUrl = imageObj?.image_url?.url || imageObj?.url;

        if (!imageUrl) {
            console.error("No image data found in OpenRouter response:", JSON.stringify(data));
            return res.status(500).json({ error: "No image data returned from AI" });
        }

        // The URL is usually a data URL: data:image/png;base64,...
        const base64Data = imageUrl.split(',')[1] || imageUrl;
        const mimeTypeMatch = imageUrl.match(/^data:(image\/[a-z]+);base64,/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/png';

        const buffer = Buffer.from(base64Data, 'base64');
        res.setHeader('Content-Type', mimeType);
        res.send(buffer);

    } catch (error) {
        console.error("4K Agent Error:", error);
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
    console.log(`API Keys loaded: ${process.env.NVIDIA_API_KEY ? 'Yes' : 'No'}`);
    console.log(`Pollinations Key loaded: ${process.env.POLLINATIONS_API_KEY ? 'Yes' : 'No'}`);
});
