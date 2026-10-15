const express = require('express');
const router = express.Router();
const {
  getRequirements,
  createRequirement,
  updateRequirement,
  deleteRequirement,
  bulkDeleteRequirements
} = require('../controllers/requirementController');
const { verifyAdmin, checkPermission } = require('../middleware/authMiddleware');

router.use(verifyAdmin);

router.get('/', getRequirements);
router.post('/', checkPermission('requireAccessAdd'), createRequirement);
router.post('/bulk-delete', checkPermission('requireAccessDelete'), bulkDeleteRequirements);
router.put('/:id', checkPermission('requireAccessEdit'), updateRequirement);
router.delete('/:id', checkPermission('requireAccessDelete'), deleteRequirement);

module.exports = router;
