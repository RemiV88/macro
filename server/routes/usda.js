const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { searchUsda } = require('../controllers/usdaController');

const router = express.Router();

router.use(requireAuth);

router.get('/search', searchUsda);

module.exports = router;
