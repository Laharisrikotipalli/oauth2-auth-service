const jwt = require('jsonwebtoken');

// Middleware to verify the access token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extract Bearer <token>

    if (!token) {
        return res.status(401).json({ error: "Access token missing" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Store user payload (id, role) in request
        next();
    } catch (err) {
        return res.status(403).json({ error: "Invalid or expired access token" });
    }
};

module.exports = authenticateToken;