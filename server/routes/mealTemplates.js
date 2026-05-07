const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const {
  listTemplates,
  createTemplate,
  getTemplate,
  updateTemplate,
  deleteTemplate,
} = require('../controllers/mealTemplateController');

const router = express.Router();

router.use(requireAuth);

router.get('/', listTemplates);
router.post('/', createTemplate);
router.get('/:id', getTemplate);
router.patch('/:id', updateTemplate);
router.delete('/:id', deleteTemplate);

module.exports = router;
