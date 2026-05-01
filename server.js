const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors()); 
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

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
            width = Math.min(width * 2, 2048); 
            height = Math.min(height * 2, 2048);
        } else if (resolution === '2K') {
            width = Math.min(Math.round(width * 1.5), 2048);
            height = Math.min(Math.round(height * 1.5), 2048);
        }

        // Determine model for Pollinations
        let pollinationsModel = 'flux'; 
        
        if (resolution === '4K' || resolution === '2K' || model === 'nanobanana-pro') {
            pollinationsModel = 'nanobanana-pro';
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

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Pollinations API Key: ${process.env.POLLINATIONS_API_KEY ? 'Loaded' : 'Missing'}`);
});
