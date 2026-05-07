const mongoose = require('mongoose');
const MealTemplate = require('../models/MealTemplate');
const Food = require('../models/Food');

const MEAL_SLOTS = MealTemplate.MEAL_SLOTS;
const MACRO_FIELDS = ['caloriesPer100g', 'proteinPer100g', 'carbsPer100g', 'fatPer100g'];

function validateTemplatePayload(body, { partial = false } = {}) {
  if (!body || typeof body !== 'object') {
    return 'Request body is required';
  }

  if (!partial || body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return 'name is required';
    }
  }

  if (!partial || body.mealSlot !== undefined) {
    if (!MEAL_SLOTS.includes(body.mealSlot)) {
      return `mealSlot must be one of: ${MEAL_SLOTS.join(', ')}`;
    }
  }

  if (!partial || body.items !== undefined) {
    if (!Array.isArray(body.items)) {
      return 'items must be an array';
    }
    for (const [idx, item] of body.items.entries()) {
      if (!item || typeof item !== 'object') {
        return `items[${idx}] is invalid`;
      }
      if (item.foodId !== undefined && item.foodId !== null) {
        if (!mongoose.isValidObjectId(item.foodId)) {
          return `items[${idx}].foodId is invalid`;
        }
      }
      if (typeof item.foodName !== 'string' || !item.foodName.trim()) {
        return `items[${idx}].foodName is required`;
      }
      for (const m of MACRO_FIELDS) {
        const n = Number(item[m]);
        if (!Number.isFinite(n) || n < 0) {
          return `items[${idx}].${m} must be 0 or more`;
        }
      }
      const grams = Number(item.portionGrams);
      if (!Number.isFinite(grams) || grams < 0) {
        return `items[${idx}].portionGrams must be 0 or more`;
      }
    }
  }

  return null;
}

function pickTemplateFields(body) {
  const out = {};
  if (body.name !== undefined) out.name = String(body.name).trim();
  if (body.mealSlot !== undefined) out.mealSlot = body.mealSlot;
  if (body.items !== undefined) {
    out.items = body.items.map((it) => ({
      foodId: it.foodId || null,
      foodName: String(it.foodName).trim(),
      portionGrams: Number(it.portionGrams),
      caloriesPer100g: Number(it.caloriesPer100g),
      proteinPer100g: Number(it.proteinPer100g),
      carbsPer100g: Number(it.carbsPer100g),
      fatPer100g: Number(it.fatPer100g),
    }));
  }
  return out;
}

// Ensure foodIds reference foods that belong to this user. Items without a
// foodId (USDA-derived, inline only) are skipped — they don't need ownership.
async function ensureItemsBelongToUser(items, userId) {
  if (!items) return null;
  const withFoodId = items.filter((i) => i.foodId);
  if (withFoodId.length === 0) return null;
  const ids = withFoodId.map((i) => i.foodId);
  const foods = await Food.find({ _id: { $in: ids }, userId }).select('_id');
  const found = new Set(foods.map((f) => String(f._id)));
  for (const id of ids) {
    if (!found.has(String(id))) return 'One or more foods not found';
  }
  return null;
}

// Read-time normalizer. Old documents (pre-schema-relaxation) only stored
// foodId + portionGrams. We backfill the inline fields from the populated
// foodId so the wire format is consistent for clients.
function normalizeTemplateForRead(template) {
  if (!template) return template;
  const obj = template.toJSON ? template.toJSON() : JSON.parse(JSON.stringify(template));
  obj.items = (obj.items || []).map((item) => {
    const populated = item.foodId && typeof item.foodId === 'object' ? item.foodId : null;
    const foodIdValue = populated ? populated._id : (item.foodId || null);
    return {
      _id: item._id,
      foodId: foodIdValue,
      foodName: item.foodName || populated?.name || 'Unknown food',
      portionGrams: item.portionGrams,
      caloriesPer100g:
        item.caloriesPer100g != null ? item.caloriesPer100g : (populated?.caloriesPer100g ?? 0),
      proteinPer100g:
        item.proteinPer100g != null ? item.proteinPer100g : (populated?.proteinPer100g ?? 0),
      carbsPer100g:
        item.carbsPer100g != null ? item.carbsPer100g : (populated?.carbsPer100g ?? 0),
      fatPer100g:
        item.fatPer100g != null ? item.fatPer100g : (populated?.fatPer100g ?? 0),
    };
  });
  return obj;
}

async function listTemplates(req, res) {
  const templates = await MealTemplate.find({ userId: req.user._id })
    .collation({ locale: 'en', strength: 2 })
    .sort({ name: 1 })
    .populate('items.foodId');
  res.json({ templates: templates.map(normalizeTemplateForRead) });
}

async function createTemplate(req, res) {
  const error = validateTemplatePayload(req.body);
  if (error) return res.status(400).json({ error });

  const fields = pickTemplateFields(req.body);
  const ownershipError = await ensureItemsBelongToUser(fields.items, req.user._id);
  if (ownershipError) return res.status(400).json({ error: ownershipError });

  const created = await MealTemplate.create({
    ...fields,
    userId: req.user._id,
  });
  const template = await MealTemplate.findById(created._id).populate('items.foodId');
  res.status(201).json({ template: normalizeTemplateForRead(template) });
}

async function getTemplate(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'Meal template not found' });
  }
  const template = await MealTemplate.findOne({
    _id: req.params.id,
    userId: req.user._id,
  }).populate('items.foodId');
  if (!template) return res.status(404).json({ error: 'Meal template not found' });
  res.json({ template: normalizeTemplateForRead(template) });
}

async function updateTemplate(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'Meal template not found' });
  }

  const error = validateTemplatePayload(req.body, { partial: true });
  if (error) return res.status(400).json({ error });

  const updates = pickTemplateFields(req.body);
  if (updates.items) {
    const ownershipError = await ensureItemsBelongToUser(updates.items, req.user._id);
    if (ownershipError) return res.status(400).json({ error: ownershipError });
  }

  const template = await MealTemplate.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: updates },
    { new: true, runValidators: true }
  ).populate('items.foodId');
  if (!template) return res.status(404).json({ error: 'Meal template not found' });
  res.json({ template: normalizeTemplateForRead(template) });
}

async function deleteTemplate(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'Meal template not found' });
  }
  const result = await MealTemplate.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!result) return res.status(404).json({ error: 'Meal template not found' });
  res.json({ ok: true });
}

module.exports = {
  listTemplates,
  createTemplate,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  // Exported for the loggedMealController so logging-from-template uses the
  // same backfill rules without duplicating logic.
  normalizeTemplateForRead,
};
