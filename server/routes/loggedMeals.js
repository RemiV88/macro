const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const {
  listLoggedMeals,
  getLoggedMeal,
  createLoggedMeal,
  updateLoggedMeal,
  deleteLoggedMeal,
} = require('../controllers/loggedMealController');

const router = express.Router();

router.use(requireAuth);

router.get('/', listLoggedMeals);
router.post('/', createLoggedMeal);
router.get('/:id', getLoggedMeal);
router.patch('/:id', updateLoggedMeal);
router.delete('/:id', deleteLoggedMeal);

module.exports = router;
