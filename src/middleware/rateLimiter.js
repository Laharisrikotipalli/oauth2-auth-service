const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redisClient = require('../config/redis');

const authLimiter = rateLimit({
    // Use Redis to sync counts across restarts
    store: new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
    }),
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // Limit each IP to 10 requests per windowMs
    message: { error: "Too many login attempts, please try again after a minute" },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,
});

module.exports = authLimiter;