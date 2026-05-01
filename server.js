const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors()); 
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// Image Generation Proxy (Specialized for ChandraXImage / OpenClaw)
app.get('/api/proxy/image', async (req, res) => {
    try {
        const { prompt, aspect_ratio, resolution, model } = req.query;
        const openRouterKey = process.env.OPENROUTER_API_KEY;
        const pollinationsKey = process.env.POLLINATIONS_API_KEY;

        console.log(`Requesting generation: "${prompt}" [Ratio: ${aspect_ratio}, Res: ${resolution}, Model: ${model}]`);

        // Try OpenRouter first (Professional 4K Agent / OpenClaw style)
        if (openRouterKey) {
            try {
                console.log("Attempting OpenRouter Image Generation...");
                
                // Map model for OpenRouter
                let apiModel = "black-forest-labs/flux-pro-1.1"; // Default Pro
                if (model === 'diffusion-4k') apiModel = "black-forest-labs/flux-pro-1.1";
                if (model === 'nanobanana-pro') apiModel = "black-forest-labs/flux-pro";
                if (model === 'seedream-pro') apiModel = "google/gemini-2.0-flash-exp:free";

                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${openRouterKey}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://chandraximage.com", // Optional
                        "X-Title": "ChandraXImage"
                    },
                    body: JSON.stringify({
                        model: apiModel,
                        messages: [{ role: "user", content: `Generate an ultra-high-resolution 4K ${aspect_ratio || '1:1'} professional image: ${prompt}. ultra-detailed, sharp focus, masterpiece, high quality.` }],
                        modalities: ["image"]
                    })
                });

                const data = await response.json();
                
                if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
                    const content = data.choices[0].message.content;
                    // OpenRouter returns images as base64 in content (usually markdown or direct URL)
                    // If it's a data URL, we can send it directly or proxy it
                    if (content.includes("data:image")) {
                        console.log("OpenRouter returned base64 image.");
                        const base64Data = content.match(/data:image\/[a-zA-Z]*;base64,[^"'\s\)]+/);
                        if (base64Data) {
                            const [full, type] = base64Data[0].split(',');
                            res.setHeader('Content-Type', full.split(':')[1].split(';')[0]);
                            return res.send(Buffer.from(type, 'base64'));
                        }
                    }
                }
                console.log("OpenRouter did not return an image, falling back to Pollinations...");
            } catch (err) {
                console.error("OpenRouter Error:", err.message);
            }
        }

        // Fallback to Pollinations (Diffusion-4K logic)
        console.log("Using Pollinations/Diffusion-4K engine for Ultra HD...");
        
        // Map aspect ratio to width/height
        let width = 1024, height = 1024;
        if (aspect_ratio === '16:9') { width = 1792; height = 1024; }
        else if (aspect_ratio === '9:16') { width = 1024; height = 1792; }
        else if (aspect_ratio === '4:3') { width = 1440; height = 1080; }
        else if (aspect_ratio === '3:4') { width = 1080; height = 1440; }
        else if (aspect_ratio === '21:9') { width = 2048; height = 864; }

        if (resolution === '4K') { 
            width = Math.min(width * 1.5, 3072); 
            height = Math.min(height * 1.5, 3072); 
        }
        else if (resolution === '2K') { 
            width = Math.min(Math.round(width * 1.25), 2048); 
            height = Math.min(Math.round(height * 1.25), 2048); 
        }

        let pollinationsModel = 'flux'; 
        if (resolution === '4K' || resolution === '2K' || model === 'nanobanana-pro' || model === 'diffusion-4k') pollinationsModel = 'flux-pro';

        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&model=${pollinationsModel}&seed=${Math.floor(Math.random() * 1000000)}&nologo=true&enhance=true&quality=100&hd=true`;
        
        const response = await fetch(pollinationsUrl);

        if (!response.ok) throw new Error(`Pollinations Error: ${response.status}`);

        const buffer = await response.arrayBuffer();
        res.setHeader('Content-Type', response.headers.get('content-type') || 'image/png');
        res.send(Buffer.from(buffer));

    } catch (error) {
        console.error("Image Generation Proxy Failure:", error);
        res.status(500).send("Error generating image: " + error.message);
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`ChandraXImage Server active on port ${PORT}`);
    console.log(`OpenRouter Key: ${process.env.OPENROUTER_API_KEY ? 'Active' : 'Missing'}`);
    console.log(`Pollinations Key: ${process.env.POLLINATIONS_API_KEY ? 'Active' : 'Missing'}`);
});
