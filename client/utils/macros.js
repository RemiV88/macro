export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];

export function slotLabel(slot) {
  if (!slot) return '';
  return slot.charAt(0).toUpperCase() + slot.slice(1);
}

// Convert a MealTemplate item into a normalized shape. Items now carry their
// own inline foodName + per-100g macros (snapshotted at template-creation
// time), so we read those first. We fall back to the populated foodId for old
// documents written before the schema relaxation, where only foodId was
// stored. The server's read-time normalizer also backfills, so this fallback
// is mostly defensive.
export function normalizeTemplateItem(item) {
  const populated = item.foodId && typeof item.foodId === 'object' ? item.foodId : null;
  const foodIdValue = populated ? populated._id : (item.foodId || null);
  return {
    foodId: foodIdValue,
    name: item.foodName || populated?.name || 'Unknown food',
    portionGrams: Number(item.portionGrams) || 0,
    caloriesPer100g: Number(
      item.caloriesPer100g != null ? item.caloriesPer100g : populated?.caloriesPer100g ?? 0
    ),
    proteinPer100g: Number(
      item.proteinPer100g != null ? item.proteinPer100g : populated?.proteinPer100g ?? 0
    ),
    carbsPer100g: Number(
      item.carbsPer100g != null ? item.carbsPer100g : populated?.carbsPer100g ?? 0
    ),
    fatPer100g: Number(
      item.fatPer100g != null ? item.fatPer100g : populated?.fatPer100g ?? 0
    ),
  };
}

// Convert a LoggedMeal item (already a snapshot) into the normalized shape.
export function normalizeLoggedItem(item) {
  return {
    _id: item._id,
    foodId: item.foodId,
    name: item.foodName || 'Unknown food',
    portionGrams: Number(item.portionGrams) || 0,
    caloriesPer100g: Number(item.caloriesPer100g) || 0,
    proteinPer100g: Number(item.proteinPer100g) || 0,
    carbsPer100g: Number(item.carbsPer100g) || 0,
    fatPer100g: Number(item.fatPer100g) || 0,
  };
}

export function itemKcal(item) {
  return (item.caloriesPer100g * item.portionGrams) / 100;
}

export function itemMacro(item, key) {
  return (item[key] * item.portionGrams) / 100;
}

export function computeMealTotals(items) {
  const totals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const it of items) {
    const factor = it.portionGrams / 100;
    totals.kcal += (it.caloriesPer100g || 0) * factor;
    totals.protein += (it.proteinPer100g || 0) * factor;
    totals.carbs += (it.carbsPer100g || 0) * factor;
    totals.fat += (it.fatPer100g || 0) * factor;
  }
  return totals;
}

export function computeDayTotals(loggedMeals) {
  const totals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const meal of loggedMeals) {
    const items = (meal.items || []).map(normalizeLoggedItem);
    const t = computeMealTotals(items);
    totals.kcal += t.kcal;
    totals.protein += t.protein;
    totals.carbs += t.carbs;
    totals.fat += t.fat;
  }
  return totals;
}
