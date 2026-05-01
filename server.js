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

        console.log(`[Proxy] Request: "${prompt}" [Ratio: ${aspect_ratio}, Res: ${resolution}]`);

        // 1. Try OpenRouter (Pro Models)
        if (openRouterKey) {
            try {
                let apiModel = "black-forest-labs/flux-pro-1.1";
                if (model === 'flux') apiModel = "black-forest-labs/flux-pro";
                
                const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${openRouterKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: apiModel,
                        messages: [{ role: "user", content: `Generate an ultra-high-resolution 4K ${aspect_ratio || '1:1'} professional image: ${prompt}. masterpiece, high quality.` }],
                        modalities: ["image"]
                    })
                });

                if (orResponse.ok) {
                    const data = await orResponse.json();
                    const content = data.choices?.[0]?.message?.content;
                    if (content && content.includes("data:image")) {
                        const base64Match = content.match(/data:image\/[a-zA-Z]*;base64,[^"'\s\)]+/);
                        if (base64Match) {
                            const [full, type] = base64Match[0].split(',');
                            res.setHeader('Content-Type', full.split(':')[1].split(';')[0]);
                            res.setHeader('Access-Control-Allow-Origin', '*');
                            return res.send(Buffer.from(type, 'base64'));
                        }
                    }
                }
            } catch (err) {
                console.error("[Proxy] OR Error:", err.message);
            }
        }

        // 2. Fallback to Pollinations
        let width = 1024, height = 1024;
        if (aspect_ratio === '16:9') { width = 1792; height = 1024; }
        else if (aspect_ratio === '9:16') { width = 1024; height = 1792; }
        else if (aspect_ratio === '4:3') { width = 1440; height = 1080; }
        else if (aspect_ratio === '21:9') { width = 2048; height = 864; }

        if (resolution === '4K') { width = Math.min(width * 1.5, 2048); height = Math.min(height * 1.5, 2048); }

        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&model=flux&seed=${Math.floor(Math.random() * 1000000)}&nologo=true&enhance=true`;
        
        const pollResponse = await fetch(pollinationsUrl);
        if (pollResponse.ok) {
            const buffer = await pollResponse.arrayBuffer();
            res.setHeader('Content-Type', pollResponse.headers.get('content-type') || 'image/png');
            res.setHeader('Access-Control-Allow-Origin', '*');
            console.log("[Proxy] Success via Pollinations");
            return res.send(Buffer.from(buffer));
        }

        throw new Error(`Service error ${pollResponse.status}`);

    } catch (error) {
        console.error("[Proxy] Failure:", error.message);
        res.status(500).send("Generation failed.");
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`ChandraXImage PRO running on ${PORT}`);
});
