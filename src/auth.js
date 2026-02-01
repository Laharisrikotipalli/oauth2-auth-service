const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("./config/db");

/* ================= REGISTER ================= */
exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password || password.length < 8) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const exists = await pool.query(
    "SELECT id FROM users WHERE email=$1",
    [email]
  );

  if (exists.rows.length) {
    return res.status(409).json({ error: "User already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1,$2,$3,'user')
     RETURNING id,name,email,role`,
    [name, email, passwordHash]
  );

  res.status(201).json(result.rows[0]);
};

/* ================= LOGIN ================= */
exports.login = async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE email=$1",
    [email]
  );

  if (!result.rows.length) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const user = result.rows[0];

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

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

/* ================= REFRESH ================= */
exports.refresh = async (req, res) => {
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
