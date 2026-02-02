const express = require('express');
const router = express.Router();
const userCtrl = require('../controllers/userController'); // Move profile logic here
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

// Protected Profile (Req 10 & 11) - Path: /api/users/me
router.get('/me', authenticate, userCtrl.getMe);
router.patch('/me', authenticate, userCtrl.updateMe);

// Admin Only (Req 12) - Path: /api/users
router.get('/', authenticate, authorize(['admin']), userCtrl.getAllUsers);

module.exports = router;