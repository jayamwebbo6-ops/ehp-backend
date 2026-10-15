const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser, deleteUser } = require('../controllers/userController');
const { verifyAdmin, verifySuperAdmin } = require('../middleware/authMiddleware');

// Apply verifyAdmin to all user management routes
router.use(verifyAdmin);

// GET route allows both Admin and Sub-Admin roles
router.get('/', getUsers);

// Write routes (create, update, delete) are restricted to Super Admin (Admin role)
router.post('/', verifySuperAdmin, createUser);
router.put('/:id', verifySuperAdmin, updateUser);
router.delete('/:id', verifySuperAdmin, deleteUser);

module.exports = router;
