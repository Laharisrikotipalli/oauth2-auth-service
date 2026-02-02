const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis'); // Note the { }
const redisClient = require('../config/redis');

const authLimiter = rateLimit({
    store: new RedisStore({
        // Use the sendCommand method for the newer redis v4+ client
        sendCommand: (...args) => redisClient.sendCommand(args),
    }),
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // 10 attempts
    message: { error: "Too many login attempts, please try again after a minute" },
    standardHeaders: true, 
    legacyHeaders: false,
});

module.exports = authLimiter;