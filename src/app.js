const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const auth = require("./auth");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/auth/register", auth.register);
app.post("/api/auth/login", auth.login);
app.post("/api/auth/refresh", auth.refresh);

module.exports = app;
