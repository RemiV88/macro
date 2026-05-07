const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const {
  listWeightLogs,
  createWeightLog,
  deleteWeightLog,
} = require('../controllers/weightLogController');

const router = express.Router();

router.use(requireAuth);

router.get('/', listWeightLogs);
router.post('/', createWeightLog);
router.delete('/:id', deleteWeightLog);

module.exports = router;
