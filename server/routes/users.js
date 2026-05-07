const express = require('express');
const { updateOnboarding, updateMe } = require('../controllers/userController');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.patch('/me/onboarding', requireAuth, updateOnboarding);
router.patch('/me', requireAuth, updateMe);

module.exports = router;
