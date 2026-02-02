const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const pool = require('../config/db');
const redisClient = require('../config/redis');

// --- LOCAL AUTH ---

// Requirement 5: Registration
exports.registerUser = async (req, res) => {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password || password.length < 8) {
        return res.status(400).json({ error: "Invalid input: Name, valid email, and 8+ char password required" });
    }

    try {
        // Hash password with 10 salt rounds
        const passwordHash = await bcrypt.hash(password, 10);
        
        const result = await pool.query(
            'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
            [name, email, passwordHash, 'user']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: "User already exists" });
        console.error("Reg Error:", err);
        res.status(500).json({ error: "Database error" });
    }
};

// Requirement 6: Login
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
    
    try {
        // 1. Fetch user by email
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        // Debugging logs (Check your docker logs)
        if (!user) {
            console.log(`Login attempt failed: Email ${email} not found.`);
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // 2. Compare passwords (CRITICAL: MUST USE AWAIT)
        const isMatch = await bcrypt.compare(password, user.password_hash);
        console.log(`Password match for ${email}:`, isMatch);

        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // 3. Generate Tokens (Ensure JWT_SECRET and JWT_REFRESH_SECRET are in .env)
        const accessToken = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '15m' }
        );
        
        const refreshToken = jwt.sign(
            { id: user.id }, 
            process.env.JWT_REFRESH_SECRET, 
            { expiresIn: '7d' }
        );

        // 4. Store Refresh Token in Redis (Requirement 9)
        await redisClient.set(`refresh_token:${user.id}`, refreshToken, { 
            EX: 7 * 24 * 60 * 60 
        });

        res.json({ 
            accessToken, 
            refreshToken,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: "Server error during login" });
    }
};

// Requirement 9: POST /api/auth/refresh
exports.tokenRefresh = async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: "No token provided" });

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const stored = await redisClient.get(`refresh_token:${decoded.id}`);
        
        if (stored !== refreshToken) {
            return res.status(401).json({ error: "Invalid or revoked token" });
        }

        const newAccessToken = jwt.sign(
            { id: decoded.id }, 
            process.env.JWT_SECRET, 
            { expiresIn: '15m' }
        );
        res.json({ accessToken: newAccessToken });
    } catch (err) {
        res.status(401).json({ error: "Expired or invalid refresh token" });
    }
};

// --- OAUTH AUTH (Requirement 8) ---



exports.oauthCallback = async (req, res) => {
    const { code } = req.query;
    const provider = req.path.includes('google') ? 'google' : 'github';

    if (!code) return res.status(400).json({ error: "Authorization code missing" });

    try {
        let email, name, providerId;

        if (provider === 'google') {
            const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: `http://localhost:8081/api/auth/google/callback`,
                grant_type: 'authorization_code',
            });
            const userRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
            });
            email = userRes.data.email;
            name = userRes.data.name;
            providerId = userRes.data.id;
        } else {
            const tokenRes = await axios.post('https://github.com/login/oauth/access_token', {
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
            }, { headers: { Accept: 'application/json' } });

            const userRes = await axios.get('https://api.github.com/user', {
                headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
            });
            const emailsRes = await axios.get('https://api.github.com/user/emails', {
                headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
            });
            email = emailsRes.data.find(e => e.primary).email;
            name = userRes.data.name || userRes.data.login;
            providerId = userRes.data.id.toString();
        }

        let userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        let user = userResult.rows[0];

        if (!user) {
            user = (await pool.query(
                'INSERT INTO users (name, email, role) VALUES ($1, $2, $3) RETURNING *',
                [name, email, 'user']
            )).rows[0];
        }

        await pool.query(
            'INSERT INTO auth_providers (user_id, provider, provider_user_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [user.id, provider, providerId]
        );

        const accessToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

        res.json({ accessToken, refreshToken });
    } catch (err) {
        console.error(`${provider} OAuth Error:`, err.response?.data || err.message);
        res.status(500).json({ error: "OAuth Authentication failed" });
    }
};