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

// Walk back from "today" in the user's local time, counting consecutive days
// that contain ≥1 LoggedMeal. We can't trust the client to compute this — if
// the user has an empty today we still continue from yesterday (today doesn't
// break a streak that earned its first day yesterday).
async function getStreak(req, res) {
  // tz query param accepted for future use; for now we treat dates as UTC,
  // which matches what the rest of the app stores (date is a UTC midnight).
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Look back up to 365 days. Past that, returning the cap is fine.
  const MAX_LOOKBACK_DAYS = 365;
  const since = new Date(today.getTime() - MAX_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  // Pull only the dates field for every meal in the window — far cheaper than
  // counting per day with a separate query.
  const meals = await LoggedMeal.find(
    { userId: req.user._id, date: { $gte: since, $lte: today } },
    { date: 1 }
  ).lean();

  const daysWithMeals = new Set();
  for (const m of meals) {
    const d = new Date(m.date);
    d.setUTCHours(0, 0, 0, 0);
    daysWithMeals.add(d.getTime());
  }

  let streak = 0;
  let cursor = today.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  // Special case: empty today shouldn't break a streak that's actively
  // building — start counting from yesterday if today is empty.
  if (!daysWithMeals.has(cursor)) {
    cursor -= dayMs;
  }

  while (daysWithMeals.has(cursor)) {
    streak++;
    cursor -= dayMs;
  }

  res.json({ streak });
}

// Per-day totals for a date range. Used by the History calendar to color-code
// each cell. Range is hard-capped at 60 days to keep payloads small.
async function getDailySummary(req, res) {
  const fromStr = req.query.from;
  const toStr = req.query.to;
  const from = parseLocalDate(fromStr);
  const to = parseLocalDate(toStr);
  if (!from || !to) {
    return res.status(400).json({ error: 'from and to are required (YYYY-MM-DD)' });
  }
  if (to.getTime() < from.getTime()) {
    return res.status(400).json({ error: 'to must be on or after from' });
  }
  const dayMs = 24 * 60 * 60 * 1000;
  const spanDays = Math.round((to.getTime() - from.getTime()) / dayMs) + 1;
  if (spanDays > 60) {
    return res.status(400).json({ error: 'range must be 60 days or fewer' });
  }
  const next = new Date(to.getTime() + dayMs);

  const meals = await LoggedMeal.find({
    userId: req.user._id,
    date: { $gte: from, $lt: next },
  }).lean();

  // Build a map keyed by YYYY-MM-DD. Aggregate macros per day, then emit one
  // row per day in [from, to] so the client can render zeros for empty days
  // without filtering.
  const byDate = new Map();
  for (const m of meals) {
    const d = new Date(m.date);
    d.setUTCHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    let agg = byDate.get(key);
    if (!agg) {
      agg = { calories: 0, protein: 0, carbs: 0, fat: 0, mealCount: 0 };
      byDate.set(key, agg);
    }
    for (const it of m.items || []) {
      const factor = (it.portionGrams || 0) / 100;
      agg.calories += (it.caloriesPer100g || 0) * factor;
      agg.protein += (it.proteinPer100g || 0) * factor;
      agg.carbs += (it.carbsPer100g || 0) * factor;
      agg.fat += (it.fatPer100g || 0) * factor;
    }
    agg.mealCount++;
  }

  const days = [];
  for (let t = from.getTime(); t <= to.getTime(); t += dayMs) {
    const d = new Date(t);
    const key = d.toISOString().slice(0, 10);
    const agg = byDate.get(key) || { calories: 0, protein: 0, carbs: 0, fat: 0, mealCount: 0 };
    days.push({
      date: key,
      calories: Math.round(agg.calories),
      protein: Math.round(agg.protein),
      carbs: Math.round(agg.carbs),
      fat: Math.round(agg.fat),
      mealCount: agg.mealCount,
    });
  }

  res.json({ days });
}

// Last-7-days roll-up used by the Profile screen. We aggregate macro totals
// per day in JS rather than via a Mongo $group pipeline because the kcal
// derivation (per-100g × portion) lives on each item, not on a precomputed
// total. Loading 7 days of meals for one user is bounded by user behavior
// and stays small.
async function getWeeklyStats(req, res) {
  const dayMs = 24 * 60 * 60 * 1000;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const start = new Date(today.getTime() - 6 * dayMs); // 7-day window inclusive
  const next = new Date(today.getTime() + dayMs);

  const meals = await LoggedMeal.find({
    userId: req.user._id,
    date: { $gte: start, $lt: next },
  }).lean();

  // Per-day totals — keyed by YYYY-MM-DD so we can reason about empty days.
  const byDate = new Map();
  for (const m of meals) {
    const d = new Date(m.date);
    d.setUTCHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    let agg = byDate.get(key);
    if (!agg) {
      agg = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
      byDate.set(key, agg);
    }
    for (const it of m.items || []) {
      const factor = (it.portionGrams || 0) / 100;
      agg.kcal += (it.caloriesPer100g || 0) * factor;
      agg.protein += (it.proteinPer100g || 0) * factor;
      agg.carbs += (it.carbsPer100g || 0) * factor;
      agg.fat += (it.fatPer100g || 0) * factor;
    }
  }

  const target = Number(req.user.dailyCalorieTarget) || 0;
  let kcalSum = 0;
  let daysWithData = 0;
  let daysOnTarget = 0;
  // Macro %s averaged across days that have any food logged — averaging
  // across empty days would bias toward zero and misrepresent intent.
  const macroPctSum = { protein: 0, carbs: 0, fat: 0 };

  for (let t = start.getTime(); t <= today.getTime(); t += dayMs) {
    const key = new Date(t).toISOString().slice(0, 10);
    const agg = byDate.get(key);
    if (!agg) continue;
    if (agg.kcal <= 0) continue;
    daysWithData++;
    kcalSum += agg.kcal;
    if (target > 0 && agg.kcal >= target * 0.9 && agg.kcal <= target * 1.1) {
      daysOnTarget++;
    }
    const proteinKcal = agg.protein * 4;
    const carbsKcal = agg.carbs * 4;
    const fatKcal = agg.fat * 9;
    const denom = proteinKcal + carbsKcal + fatKcal;
    if (denom > 0) {
      macroPctSum.protein += (proteinKcal / denom) * 100;
      macroPctSum.carbs += (carbsKcal / denom) * 100;
      macroPctSum.fat += (fatKcal / denom) * 100;
    }
  }

  const totalDays = 7;
  // Average over days the user actually logged something — empty days would
  // distort the picture toward zero and misrepresent typical daily intake.
  const avgCalories = daysWithData > 0 ? Math.round(kcalSum / daysWithData) : null;
  const macroAvg =
    daysWithData > 0
      ? {
          protein: Math.round(macroPctSum.protein / daysWithData),
          carbs: Math.round(macroPctSum.carbs / daysWithData),
          fat: Math.round(macroPctSum.fat / daysWithData),
        }
      : { protein: 0, carbs: 0, fat: 0 };

  res.json({
    avgCalories,
    dailyCalorieTarget: target,
    // daysOnTarget / daysWithData is the meaningful ratio — counting empty
    // days against the user punishes them for not logging rather than for
    // missing the target on days they did log.
    daysOnTarget: daysWithData > 0 ? daysOnTarget : null,
    daysWithData,
    totalDays,
    macroAvg,
  });
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
  getStreak,
  getDailySummary,
  getWeeklyStats,
};
