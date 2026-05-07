const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const {
  listFoods,
  createFood,
  getFood,
  updateFood,
  deleteFood,
} = require('../controllers/foodController');

const router = express.Router();

router.use(requireAuth);

router.get('/', listFoods);
router.post('/', createFood);
router.get('/:id', getFood);
router.patch('/:id', updateFood);
router.delete('/:id', deleteFood);

module.exports = router;
