const express = require("express");
const router = express.Router();

const {
  register,
  login,
  refresh,
  googleAuth,
  googleCallback,
  githubAuth,
  githubCallback
} = require("../controllers/auth.controller");

// email/password
router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);

// Google OAuth
router.get("/google", googleAuth);
router.get("/google/callback", googleCallback);

// GitHub OAuth
router.get("/github", githubAuth);
router.get("/github/callback", githubCallback);

module.exports = router;
