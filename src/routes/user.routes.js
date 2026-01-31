const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const router = express.Router();

function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.sendStatus(401);

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.sendStatus(401);
  }
}

router.get("/me", auth, async (req, res) => {
  const result = await pool.query(
    "SELECT id,name,email,role FROM users WHERE id=$1",
    [req.user.id]
  );
  res.json(result.rows[0]);
});

router.get("/", auth, async (req, res) => {
  if (req.user.role !== "admin") return res.sendStatus(403);
  const users = await pool.query(
    "SELECT id,name,email,role FROM users"
  );
  res.json(users.rows);
});

module.exports = router;
