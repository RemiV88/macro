const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const {
  searchRecipes,
  randomRecipe,
  getRecipeById,
} = require('../controllers/recipeController');

const router = express.Router();

router.use(requireAuth);

router.get('/search', searchRecipes);
router.get('/random', randomRecipe);
router.get('/:id', getRecipeById);

module.exports = router;
