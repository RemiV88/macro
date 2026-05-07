const USDA_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const DATA_TYPES = ['Foundation', 'SR Legacy', 'Survey (FNDDS)'];
const PAGE_SIZE = 15;

const NUTRIENT_IDS = {
  calories: 1008,
  protein: 1003,
  carbs: 1005,
  fat: 1004,
};

const ENERGY_NAMES = new Set(['energy', 'energy (atwater general factors)', 'energy (atwater specific factors)']);

function findNutrient(foodNutrients, key) {
  const targetId = NUTRIENT_IDS[key];
  for (const n of foodNutrients || []) {
    if (n.nutrientId === targetId) return n;
  }
  if (key === 'calories') {
    for (const n of foodNutrients || []) {
      const name = (n.nutrientName || '').toLowerCase();
      const unit = (n.unitName || '').toUpperCase();
      if (ENERGY_NAMES.has(name) && unit === 'KCAL') return n;
    }
  }
  return null;
}

function getValue(nutrient) {
  if (!nutrient) return null;
  const v = nutrient.value;
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function shapeFood(item) {
  const nutrients = item.foodNutrients || [];
  const calories = getValue(findNutrient(nutrients, 'calories'));
  const protein = getValue(findNutrient(nutrients, 'protein'));
  const carbs = getValue(findNutrient(nutrients, 'carbs'));
  const fat = getValue(findNutrient(nutrients, 'fat'));

  if (calories == null || protein == null || carbs == null || fat == null) {
    return null;
  }

  return {
    fdcId: item.fdcId,
    name: item.description,
    category: item.foodCategory || null,
    calories: Math.round(calories * 10) / 10,
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
  };
}

async function searchUsda(req, res) {
  const q = (req.query.q || '').trim();
  if (!q) {
    return res.status(400).json({ error: 'q is required' });
  }

  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'USDA API key not configured' });
  }

  // USDA's GET form rejects dataType values with spaces/parens (nginx 400),
  // so we POST with a JSON body instead.
  const url = new URL(USDA_SEARCH_URL);
  url.searchParams.set('api_key', apiKey);

  let usdaRes;
  try {
    usdaRes = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: q,
        dataType: DATA_TYPES,
        pageSize: PAGE_SIZE,
      }),
    });
  } catch (err) {
    console.error('[usda] fetch failed', err);
    return res.status(502).json({ error: 'USDA upstream unreachable' });
  }

  if (!usdaRes.ok) {
    const body = await usdaRes.text().catch(() => '');
    console.error('[usda] upstream error', usdaRes.status, body);
    return res.status(502).json({ error: `USDA upstream returned ${usdaRes.status}` });
  }

  const data = await usdaRes.json();
  const foods = (data.foods || []).map(shapeFood).filter(Boolean);
  res.json({ foods });
}

module.exports = { searchUsda };
