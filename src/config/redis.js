const redis = require('redis');
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://cache:6379'
});

redisClient.on('error', (err) => console.error('Redis Error', err));

(async () => {
    try {
        await redisClient.connect();
        console.log('Redis connected successfully');
    } catch (err) {
        console.error('Redis Connection Failed', err);
    }
})();

module.exports = redisClient;