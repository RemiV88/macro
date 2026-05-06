const express = require('express');
const { updateOnboarding } = require('../controllers/userController');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.patch('/me/onboarding', requireAuth, updateOnboarding);

module.exports = router;
