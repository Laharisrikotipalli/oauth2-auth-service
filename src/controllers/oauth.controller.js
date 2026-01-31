const axios = require("axios");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

/* ================== HELPERS ================== */

function signTokens(user) {
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

  return { accessToken, refreshToken };
}

async function findOrCreateOAuthUser({
  email,
  name,
  provider,
  providerUserId,
}) {
  // 1. Check provider link
  const providerCheck = await pool.query(
    `SELECT u.*
     FROM auth_providers ap
     JOIN users u ON u.id = ap.user_id
     WHERE ap.provider=$1 AND ap.provider_user_id=$2`,
    [provider, providerUserId]
  );

  if (providerCheck.rows.length) {
    return providerCheck.rows[0];
  }

  // 2. Check user by email
  let userRes = await pool.query(
    "SELECT * FROM users WHERE email=$1",
    [email]
  );

  let user;

  if (userRes.rows.length === 0) {
    // Create new user
    userRes = await pool.query(
      `INSERT INTO users (name,email)
       VALUES ($1,$2)
       RETURNING *`,
      [name, email]
    );
  }

  user = userRes.rows[0];

  // 3. Link provider
  await pool.query(
    `INSERT INTO auth_providers (user_id, provider, provider_user_id)
     VALUES ($1,$2,$3)
     ON CONFLICT DO NOTHING`,
    [user.id, provider, providerUserId]
  );

  return user;
}

/* ================== GOOGLE ================== */

exports.googleInit = (req, res) => {
  const redirectUri = "http://localhost:4000/api/oauth/google/callback";

  const url =
    "https://accounts.google.com/o/oauth2/v2/auth" +
    "?response_type=code" +
    `&client_id=${process.env.GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${redirectUri}` +
    "&scope=openid%20email%20profile";

  res.redirect(url);
};

exports.googleCallback = async (req, res) => {
  const { code } = req.query;

  const tokenRes = await axios.post(
    "https://oauth2.googleapis.com/token",
    {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: "http://localhost:4000/api/oauth/google/callback",
      grant_type: "authorization_code",
    }
  );

  const googleToken = tokenRes.data.access_token;

  const profileRes = await axios.get(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: { Authorization: `Bearer ${googleToken}` },
    }
  );

  const { email, name, id } = profileRes.data;

  const user = await findOrCreateOAuthUser({
    email,
    name,
    provider: "google",
    providerUserId: id,
  });

  const tokens = signTokens(user);

  res.json(tokens);
};

/* ================== GITHUB ================== */

exports.githubInit = (req, res) => {
  const redirectUri = "http://localhost:4000/api/oauth/github/callback";

  const url =
    "https://github.com/login/oauth/authorize" +
    `?client_id=${process.env.GITHUB_CLIENT_ID}` +
    `&redirect_uri=${redirectUri}` +
    "&scope=user:email";

  res.redirect(url);
};

exports.githubCallback = async (req, res) => {
  const { code } = req.query;

  const tokenRes = await axios.post(
    "https://github.com/login/oauth/access_token",
    {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    },
    { headers: { Accept: "application/json" } }
  );

  const githubToken = tokenRes.data.access_token;

  const userRes = await axios.get("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${githubToken}` },
  });

  const emailRes = await axios.get(
    "https://api.github.com/user/emails",
    {
      headers: { Authorization: `Bearer ${githubToken}` },
    }
  );

  const email = emailRes.data.find(e => e.primary).email;
  const name = userRes.data.name || userRes.data.login;

  const user = await findOrCreateOAuthUser({
    email,
    name,
    provider: "github",
    providerUserId: userRes.data.id.toString(),
  });

  const tokens = signTokens(user);

  res.json(tokens);
};
