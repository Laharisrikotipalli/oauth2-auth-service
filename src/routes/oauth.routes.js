const express = require("express");
const router = express.Router();

const oauth = require("../controllers/oauth.controller");

router.get("/google", oauth.googleInit);
router.get("/google/callback", oauth.googleCallback);

router.get("/github", oauth.githubInit);
router.get("/github/callback", oauth.githubCallback);

module.exports = router;
