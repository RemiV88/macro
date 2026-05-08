const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const {
  listLoggedMeals,
  getLoggedMeal,
  createLoggedMeal,
  updateLoggedMeal,
  deleteLoggedMeal,
  getStreak,
  getDailySummary,
} = require('../controllers/loggedMealController');

const router = express.Router();

router.use(requireAuth);

// IMPORTANT: keep these named routes above /:id, otherwise Express will try to
// treat 'streak' / 'summary' as a logged-meal id and return 404.
router.get('/streak', getStreak);
router.get('/summary', getDailySummary);

router.get('/', listLoggedMeals);
router.post('/', createLoggedMeal);
router.get('/:id', getLoggedMeal);
router.patch('/:id', updateLoggedMeal);
router.delete('/:id', deleteLoggedMeal);

module.exports = router;
