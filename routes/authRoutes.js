const express = require('express');
const router = express.Router();
const { sendOtp, verifyOtp, logout, getMe, updateProfile } = require('../controllers/authController');
const { verifyAdmin } = require('../middleware/authMiddleware');

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/logout', logout);
router.get('/me', verifyAdmin, getMe);
router.put('/profile', verifyAdmin, updateProfile);

module.exports = router;
