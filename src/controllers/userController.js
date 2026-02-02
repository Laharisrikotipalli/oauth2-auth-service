const pool = require('../config/db');

// Requirement 10: GET /api/users/me
exports.getMe = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, email, role, created_at FROM users WHERE id = $1', 
            [req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Could not fetch profile" });
    }
};

// Requirement 11: PATCH /api/users/me
exports.updateMe = async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: "Name is required" });
    }

    try {
        const result = await pool.query(
            'UPDATE users SET name = $1 WHERE id = $2 RETURNING id, name, email, role',
            [name, req.user.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Update failed" });
    }
};

// Requirement 12: GET /api/users (Admin Only)
exports.getAllUsers = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, role, created_at FROM users');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Admin query failed" });
    }
};