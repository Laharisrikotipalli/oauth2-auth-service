/**
 * RBAC Middleware
 * Ensures only users with specific roles (like 'admin') can access the route.
 */
const authorize = (roles = []) => {
    return (req, res, next) => {
        // req.user is populated by the authenticateToken middleware
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: "Access denied: Insufficient permissions" });
        }
        next();
    };
};

module.exports = authorize;