const mongoose = require('mongoose');
const LoggedMeal = require('../models/LoggedMeal');
const MealTemplate = require('../models/MealTemplate');
const Food = require('../models/Food');
const { normalizeTemplateForRead } = require('./mealTemplateController');

const MEAL_SLOTS = LoggedMeal.MEAL_SLOTS;
const MACRO_FIELDS = ['caloriesPer100g', 'proteinPer100g', 'carbsPer100g', 'fatPer100g'];

function parseLocalDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return date;
}

function validateInlineItem(it, idx) {
  if (!it || typeof it !== 'object') return `items[${idx}] is invalid`;
  if (it.foodId !== undefined && it.foodId !== null) {
    if (!mongoose.isValidObjectId(it.foodId)) return `items[${idx}].foodId is invalid`;
  }
  if (typeof it.foodName !== 'string' || !it.foodName.trim()) {
    return `items[${idx}].foodName is required`;
  }
  for (const m of MACRO_FIELDS) {
    const n = Number(it[m]);
    if (!Number.isFinite(n) || n < 0) return `items[${idx}].${m} must be 0 or more`;
  }
  const grams = Number(it.portionGrams);
  if (!Number.isFinite(grams) || grams < 0) return `items[${idx}].portionGrams must be 0 or more`;
  return null;
}

function snapshotItem(it) {
  return {
    foodId: it.foodId || null,
    foodName: String(it.foodName).trim(),
    portionGrams: Number(it.portionGrams),
    caloriesPer100g: Number(it.caloriesPer100g),
    proteinPer100g: Number(it.proteinPer100g),
    carbsPer100g: Number(it.carbsPer100g),
    fatPer100g: Number(it.fatPer100g),
  };
}

async function getLoggedMeal(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'Logged meal not found' });
  }
  const loggedMeal = await LoggedMeal.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!loggedMeal) return res.status(404).json({ error: 'Logged meal not found' });
  res.json({ loggedMeal });
}

async function listLoggedMeals(req, res) {
  const date = parseLocalDate(req.query.date);
  if (!date) {
    return res.status(400).json({ error: 'date query param is required (YYYY-MM-DD)' });
  }
  const next = new Date(date.getTime() + 24 * 60 * 60 * 1000);

  const loggedMeals = await LoggedMeal.find({
    userId: req.user._id,
    date: { $gte: date, $lt: next },
  }).sort({ createdAt: 1 });

  res.json({ loggedMeals });
}

async function createLoggedMeal(req, res) {
  const body = req.body || {};

  if (!MEAL_SLOTS.includes(body.mealSlot)) {
    return res.status(400).json({ error: `mealSlot must be one of: ${MEAL_SLOTS.join(', ')}` });
  }

  const date = parseLocalDate(body.date);
  if (!date) {
    return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });
  }

  let items = [];
  let templateId = null;

  if (body.templateId !== undefined && body.templateId !== null) {
    // (a) Log from a template — read normalized template, copy items as snapshots.
    // The normalizer backfills old documents that pre-date the inline-snapshot schema.
    if (!mongoose.isValidObjectId(body.templateId)) {
      return res.status(400).json({ error: 'templateId is invalid' });
    }
    const template = await MealTemplate.findOne({
      _id: body.templateId,
      userId: req.user._id,
    }).populate('items.foodId');
    if (!template) {
      return res.status(404).json({ error: 'Meal template not found' });
    }
    if (!template.items.length) {
      return res.status(400).json({ error: 'Template has no items' });
    }
    const normalized = normalizeTemplateForRead(template);
    items = normalized.items.map((it) => ({
      foodId: it.foodId || null,
      foodName: it.foodName,
      portionGrams: it.portionGrams,
      caloriesPer100g: it.caloriesPer100g,
      proteinPer100g: it.proteinPer100g,
      carbsPer100g: it.carbsPer100g,
      fatPer100g: it.fatPer100g,
    }));
    templateId = template._id;
  } else {
    // (b) Inline items — full snapshot data passed by the client. foodId is
    // optional (null for USDA-derived items that aren't in the user's library).
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return res.status(400).json({ error: 'items must be a non-empty array' });
    }
    for (const [idx, it] of body.items.entries()) {
      const err = validateInlineItem(it, idx);
      if (err) return res.status(400).json({ error: err });
    }
    // For items that DO carry a foodId, verify ownership so a malicious client
    // can't attach another user's foodId to their own logged meal.
    const idsWithFood = body.items.filter((i) => i.foodId).map((i) => i.foodId);
    if (idsWithFood.length > 0) {
      const foods = await Food.find({
        _id: { $in: idsWithFood },
        userId: req.user._id,
      }).select('_id');
      const found = new Set(foods.map((f) => String(f._id)));
      for (const id of idsWithFood) {
        if (!found.has(String(id))) {
          return res.status(400).json({ error: 'One or more foods not found' });
        }
      }
    }
    items = body.items.map(snapshotItem);
  }

  const loggedMeal = await LoggedMeal.create({
    userId: req.user._id,
    date,
    mealSlot: body.mealSlot,
    templateId,
    items,
  });

  res.status(201).json({ loggedMeal });
}

async function updateLoggedMeal(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'Logged meal not found' });
  }

  const body = req.body || {};
  const meal = await LoggedMeal.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!meal) return res.status(404).json({ error: 'Logged meal not found' });

  if (body.mealSlot !== undefined) {
    if (!MEAL_SLOTS.includes(body.mealSlot)) {
      return res.status(400).json({ error: `mealSlot must be one of: ${MEAL_SLOTS.join(', ')}` });
    }
    meal.mealSlot = body.mealSlot;
  }

  if (body.items !== undefined) {
    if (!Array.isArray(body.items)) {
      return res.status(400).json({ error: 'items must be an array' });
    }
    const byId = new Map(meal.items.map((it) => [String(it._id), it]));
    for (const [idx, patch] of body.items.entries()) {
      if (!patch || !patch._id) {
        return res.status(400).json({ error: `items[${idx}]._id is required` });
      }
      const existing = byId.get(String(patch._id));
      if (!existing) {
        return res.status(400).json({ error: `items[${idx}] not found on this meal` });
      }
      if (patch.portionGrams !== undefined) {
        const grams = Number(patch.portionGrams);
        if (!Number.isFinite(grams) || grams < 0) {
          return res.status(400).json({ error: `items[${idx}].portionGrams must be 0 or more` });
        }
        existing.portionGrams = grams;
      }
    }
  }

  await meal.save();
  res.json({ loggedMeal: meal });
}

async function deleteLoggedMeal(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'Logged meal not found' });
  }
  const result = await LoggedMeal.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!result) return res.status(404).json({ error: 'Logged meal not found' });
  res.json({ ok: true });
}

module.exports = {
  listLoggedMeals,
  getLoggedMeal,
  createLoggedMeal,
  updateLoggedMeal,
  deleteLoggedMeal,
};
