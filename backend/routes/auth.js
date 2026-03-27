const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const TOKEN_EXPIRY = '24h';

// POST /api/auth/login
router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required.' });
        }

        // Validate against env credentials
        if (
            username === process.env.ADMIN_USERNAME &&
            password === process.env.ADMIN_PASSWORD
        ) {
            const token = jwt.sign(
                { username, role: 'admin' },
                JWT_SECRET,
                { expiresIn: TOKEN_EXPIRY }
            );

            return res.json({
                success: true,
                token,
                expiresIn: TOKEN_EXPIRY,
            });
        }

        return res.status(401).json({ error: 'Invalid username or password.' });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed.' });
    }
});

// GET /api/auth/verify — check if token is still valid
router.get('/verify', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ valid: false });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ valid: true, username: decoded.username });
    } catch (err) {
        res.status(401).json({ valid: false });
    }
});

module.exports = router;
