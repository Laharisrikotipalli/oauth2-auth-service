const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const authLimiter = require('../middleware/rateLimiter');

// Local Auth (Req 5, 6, 13)
router.post('/register', authLimiter, auth.registerUser);
router.post('/login', authLimiter, auth.loginUser);

// Refresh Token (Req 9) - Path must be /api/auth/refresh
router.post('/refresh', auth.tokenRefresh);

// OAuth Redirects (Req 7)
router.get('/google', (req, res) => {
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=http://localhost:8081/api/auth/google/callback&response_type=code&scope=profile email`;
    res.redirect(url);
});

router.get('/github', (req, res) => {
    const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=user:email`;
    res.redirect(url);
});

// OAuth Callbacks (Req 8)
router.get('/google/callback', auth.oauthCallback);
router.get('/github/callback', auth.oauthCallback);

module.exports = router;