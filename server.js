const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors()); 
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// Specialized Image Engine (Optimized for 4K-Agent Synthesis)
app.get('/api/proxy/image', async (req, res) => {
    try {
        const { prompt, aspect_ratio, resolution, model } = req.query;

        console.log(`[Engine] Synthesis: "${prompt}" [${aspect_ratio}]`);

        // Dynamic Resolution Mapping
        let width = 1024, height = 1024;
        if (aspect_ratio === '16:9') { width = 1280; height = 720; }
        else if (aspect_ratio === '9:16') { width = 720; height = 1280; }
        else if (aspect_ratio === '21:9') { width = 1440; height = 612; }

        // Quality Scaling
        const scale = resolution === '4K' ? 1.5 : 1.0;
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);

        // Cap to ensure engine stability
        width = Math.min(width, 1920);
        height = Math.min(height, 1920);

        // 4K-Agent Prompt Engineering
        let finalPrompt = prompt;
        if (model === '4k-agent') {
            finalPrompt = `(4K-Agent Synthesis:1.2), ${prompt}, highly detailed, professional masterpiece, 8k resolution, sharp focus, cinematic textures`;
        }

        // Build robust Pollinations URL
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=${width}&height=${height}&model=flux&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
        
        const response = await fetch(pollinationsUrl, { signal: AbortSignal.timeout(25000) });
        if (!response.ok) throw new Error(`Engine busy (${response.status})`);

        const buffer = await response.arrayBuffer();
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.send(Buffer.from(buffer));

    } catch (error) {
        console.error("[Engine] Error:", error.message);
        res.status(500).send("Generation failed.");
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`4K-Agent Active on ${PORT}`);
});
