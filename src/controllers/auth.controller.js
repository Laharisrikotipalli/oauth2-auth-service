const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const pool = require("../config/db");

/* ================= EMAIL AUTH ================= */

exports.register = async (req, res) => {
  const { name, email, password, role = "user" } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "Missing fields" });

  const hash = await bcrypt.hash(password, 10);

  const exists = await pool.query(
    "SELECT id FROM users WHERE email=$1",
    [email]
  );
  if (exists.rows.length)
    return res.status(409).json({ error: "User exists" });

  const user = await pool.query(
    `INSERT INTO users (name,email,password_hash,role)
     VALUES ($1,$2,$3,$4)
     RETURNING id,name,email,role`,
    [name, email, hash, role]
  );

  res.status(201).json(user.rows[0]);
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE email=$1",
    [email]
  );
  if (!result.rows.length)
    return res.status(401).json({ error: "Unauthorized" });

  const user = result.rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok)
    return res.status(401).json({ error: "Unauthorized" });

  const accessToken = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ accessToken, refreshToken });
};

exports.refresh = (req, res) => {
  try {
    const payload = jwt.verify(
      req.body.refreshToken,
      process.env.JWT_REFRESH_SECRET
    );
    const accessToken = jwt.sign(
      { id: payload.id },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: "Invalid refresh token" });
  }
};

/* ================= GOOGLE OAUTH ================= */

exports.googleAuth = (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
};

exports.googleCallback = async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: "Missing code" });

  const tokenRes = await axios.post(
    "https://oauth2.googleapis.com/token",
    {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
      code,
    }
  );

  const profile = await axios.get(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: {
        Authorization: `Bearer ${tokenRes.data.access_token}`,
      },
    }
  );

  res.json(profile.data);
};

/* ================= GITHUB OAUTH ================= */

exports.githubAuth = (req, res) => {
  res.redirect(
    `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}`
  );
};

exports.githubCallback = async (req, res) => {
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

  const user = await axios.get("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenRes.data.access_token}`,
    },
  });

  res.json(user.data);
};
