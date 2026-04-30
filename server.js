const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(path.join(__dirname, '/')));

// Example endpoint for future API integration
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        // TODO: Integrate OpenAI/Gemini API here
        // const apiKey = process.env.API_KEY;
        
        // Placeholder response
        res.json({ reply: "This is a backend response. API keys will be integrated here later!" });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "An error occurred on the server." });
    }
});

// Fallback route to serve index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
