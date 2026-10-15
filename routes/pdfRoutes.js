const express = require('express');
const router = express.Router();
const { generatePDF } = require('../controllers/pdfController');
const { verifyAdmin } = require('../middleware/authMiddleware');

// Route for generating PDF, protected by admin auth
router.post('/generate', verifyAdmin, generatePDF);

module.exports = router;
