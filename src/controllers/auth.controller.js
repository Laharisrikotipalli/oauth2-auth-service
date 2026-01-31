const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const pool = require("../config/db");

/* =========================
   HELPERS
========================= */

function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
}

/* =========================
   REGISTER (EMAIL/PASSWORD)
========================= */
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: "Missing fields" });

    const existing = await pool.query(
      "SELECT id FROM users WHERE email=$1",
      [email]
    );

    if (existing.rows.length)
      return res.status(409).json({ error: "User already exists" });

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1,$2,$3)
       RETURNING id,name,email,role`,
      [name, email, hash]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
};

/* =========================
   LOGIN (EMAIL/PASSWORD)
========================= */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (!result.rows.length)
      return res.status(401).json({ error: "Invalid credentials" });

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);

    if (!ok)
      return res.status(401).json({ error: "Invalid credentials" });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    res.json({ accessToken, refreshToken });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
};

/* =========================
   REFRESH TOKEN
========================= */
exports.refresh = async (req, res) => {
  try {
    const payload = jwt.verify(
      req.body.refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    const userRes = await pool.query(
      "SELECT id, role FROM users WHERE id=$1",
      [payload.id]
    );

    if (!userRes.rows.length)
      return res.status(401).json({ error: "Invalid refresh token" });

    const accessToken = signAccessToken(userRes.rows[0]);
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: "Invalid refresh token" });
  }
};

/* =========================
   GOOGLE OAUTH
========================= */
exports.googleAuth = (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });

  res.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
};

exports.googleCallback = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: "Missing code" });

    // exchange code for token
    const tokenRes = await axios.post(
      "https://oauth2.googleapis.com/token",
      {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }
    );

    const { access_token } = tokenRes.data;

    // get profile
    const profileRes = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    const { id: providerId, email, name } = profileRes.data;

    // find or create user
    let userRes = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (!userRes.rows.length) {
      userRes = await pool.query(
        `INSERT INTO users (name, email)
         VALUES ($1,$2)
         RETURNING *`,
        [name, email]
      );
    }

    const user = userRes.rows[0];

    // link provider
    await pool.query(
      `INSERT INTO auth_providers (user_id, provider, provider_user_id)
       VALUES ($1,'google',$2)
       ON CONFLICT DO NOTHING`,
      [user.id, providerId]
    );

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    res.json({ accessToken, refreshToken });
  } catch (err) {
    console.error("Google OAuth error:", err.response?.data || err);
    res.status(500).json({ error: "Google login failed" });
  }
};

/* =========================
   GITHUB OAUTH
========================= */
exports.githubAuth = (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_REDIRECT_URI,
    scope: "user:email",
  });

  res.redirect(
    `https://github.com/login/oauth/authorize?${params.toString()}`
  );
};

exports.githubCallback = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: "Missing code" });

    const tokenRes = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: "application/json" } }
    );

    const { access_token } = tokenRes.data;

    const profileRes = await axios.get(
      "https://api.github.com/user",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    const emailRes = await axios.get(
      "https://api.github.com/user/emails",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    const email =
      emailRes.data.find(e => e.primary)?.email ||
      emailRes.data[0].email;

    let userRes = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (!userRes.rows.length) {
      userRes = await pool.query(
        `INSERT INTO users (name, email)
         VALUES ($1,$2)
         RETURNING *`,
        [profileRes.data.name || profileRes.data.login, email]
      );
    }

    const user = userRes.rows[0];

    await pool.query(
      `INSERT INTO auth_providers (user_id, provider, provider_user_id)
       VALUES ($1,'github',$2)
       ON CONFLICT DO NOTHING`,
      [user.id, profileRes.data.id]
    );

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    res.json({ accessToken, refreshToken });
  } catch (err) {
    console.error("GitHub OAuth error:", err.response?.data || err);
    res.status(500).json({ error: "GitHub login failed" });
  }
};
