const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 5502;

// Add proper MIME type handling
app.use((req, res, next) => {
    if (req.url.endsWith('.css')) {
        res.type('text/css');
    }
    next();
});

// Serve static files from multiple directories
app.use('/dist', express.static(path.join(__dirname, 'AdminSide/dist'), {
    setHeaders: (res, filePath) => {
        if (path.extname(filePath) === '.css') {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

app.use('/', express.static(path.join(__dirname, 'AdminSide'), {
    setHeaders: (res, filePath) => {
        if (path.extname(filePath) === '.css') {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

// Error handling for 404s
app.use((req, res, next) => {
    if (req.url.endsWith('.css') && res.headersSent === false) {
        console.log('CSS file not found:', req.url);
        res.status(404).send('CSS file not found');
        return;
    }
    next();
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('Static files being served from:', path.join(__dirname, 'AdminSide'));
});
