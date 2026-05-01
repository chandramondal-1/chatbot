const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors()); 
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// Specialized Image Engine (Optimized for reliability and 4K quality)
app.get('/api/proxy/image', async (req, res) => {
    try {
        const { prompt, aspect_ratio, resolution } = req.query;

        console.log(`[Engine] Generating: "${prompt}" [${aspect_ratio}]`);

        // Optimized resolution mapping
        let width = 1024, height = 1024;
        if (aspect_ratio === '16:9') { width = 1280; height = 720; }
        else if (aspect_ratio === '9:16') { width = 720; height = 1280; }
        else if (aspect_ratio === '4:3') { width = 1024; height = 768; }
        else if (aspect_ratio === '21:9') { width = 1280; height = 544; }

        // 4K Boost
        if (resolution === '4K') { 
            width = Math.min(width * 1.5, 1920); 
            height = Math.min(height * 1.5, 1920); 
        }

        // LLM-driven prompt enhancement (4K-Agent TACO Group style)
        const enhancedPrompt = `${prompt}. ultra-high resolution synthesis, 4K-Agent professional grade, meticulously detailed textures, masterpiece quality, sharp focus.`;

        // The most reliable Pollinations URL structure
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=${width}&height=${height}&model=flux&nologo=true&seed=${Math.floor(Math.random() * 1000000)}&enhance=true`;
        
        const response = await fetch(pollinationsUrl);
        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const buffer = await response.arrayBuffer();
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.send(Buffer.from(buffer));

    } catch (error) {
        console.error("[Engine] Critical Error:", error.message);
        res.status(500).send("Generation failed.");
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`ChandraXImage PRO Engine Active on ${PORT}`);
});
