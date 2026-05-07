const mongoose = require('mongoose');
const Food = require('../models/Food');

const CATEGORIES = Food.CATEGORIES;

const NUMERIC_FIELDS = ['caloriesPer100g', 'proteinPer100g', 'carbsPer100g', 'fatPer100g'];

function validateFoodPayload(body, { partial = false } = {}) {
  if (!body || typeof body !== 'object') {
    return 'Request body is required';
  }

  if (!partial || body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return 'name is required';
    }
  }

  if (!partial || body.category !== undefined) {
    if (!CATEGORIES.includes(body.category)) {
      return `category must be one of: ${CATEGORIES.join(', ')}`;
    }
  }

  for (const field of NUMERIC_FIELDS) {
    const present = body[field] !== undefined && body[field] !== null;
    if (!partial && !present) {
      return `${field} is required`;
    }
    if (present) {
      const n = Number(body[field]);
      if (!Number.isFinite(n) || n < 0) {
        return `${field} must be a non-negative number`;
      }
    }
  }

  return null;
}

function pickFoodFields(body) {
  const out = {};
  if (body.name !== undefined) out.name = String(body.name).trim();
  if (body.category !== undefined) out.category = body.category;
  for (const f of NUMERIC_FIELDS) {
    if (body[f] !== undefined && body[f] !== null) out[f] = Number(body[f]);
  }
  return out;
}

async function listFoods(req, res) {
  const foods = await Food.find({ userId: req.user._id }).collation({ locale: 'en', strength: 2 }).sort({ name: 1 });
  res.json({ foods });
}

async function createFood(req, res) {
  const error = validateFoodPayload(req.body);
  if (error) return res.status(400).json({ error });

  const food = await Food.create({
    ...pickFoodFields(req.body),
    userId: req.user._id,
  });
  res.status(201).json({ food });
}

async function getFood(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'Food not found' });
  }
  const food = await Food.findOne({ _id: req.params.id, userId: req.user._id });
  if (!food) return res.status(404).json({ error: 'Food not found' });
  res.json({ food });
}

async function updateFood(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'Food not found' });
  }

  const error = validateFoodPayload(req.body, { partial: true });
  if (error) return res.status(400).json({ error });

  const updates = pickFoodFields(req.body);

  const food = await Food.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: updates },
    { new: true, runValidators: true }
  );
  if (!food) return res.status(404).json({ error: 'Food not found' });
  res.json({ food });
}

async function deleteFood(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'Food not found' });
  }
  const result = await Food.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!result) return res.status(404).json({ error: 'Food not found' });
  res.json({ ok: true });
}

module.exports = { listFoods, createFood, getFood, updateFood, deleteFood };
