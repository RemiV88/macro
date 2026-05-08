const SPOON_BASE = 'https://api.spoonacular.com/recipes';
const RESULT_COUNT = 12;
const CACHE_TTL_MS = 60 * 60 * 1000; // Spoonacular T&Cs cap caching at 1 hour.

// In-memory cache. Process-local, lost on restart, fine for a single-instance
// dev server. Random results intentionally skip this so each tap is fresh.
// Entries linger until next access — no periodic sweeper.
const cache = new Map();

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(key, data) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// Spoonacular returns nutrients in `nutrition.nutrients` (search/info with
// nutrition flag) — values are per serving. Names are stable across endpoints.
const NUTRIENT_NAMES = {
  calories: 'Calories',
  protein: 'Protein',
  carbs: 'Carbohydrates',
  fat: 'Fat',
};

function findNutrient(nutrients, name) {
  if (!Array.isArray(nutrients)) return null;
  for (const n of nutrients) {
    if (n.name === name) return n;
  }
  return null;
}

function nutrientValue(nutrients, key) {
  const n = findNutrient(nutrients, NUTRIENT_NAMES[key]);
  if (!n || typeof n.amount !== 'number' || !Number.isFinite(n.amount)) return null;
  return Math.round(n.amount * 10) / 10;
}

// Strip Spoonacular's HTML tags out of summary/instructions for clean display.
function stripHtml(s) {
  if (!s || typeof s !== 'string') return '';
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function shapeRecipeSummary(item) {
  const nutrients = item.nutrition?.nutrients;
  return {
    id: item.id,
    title: item.title,
    image: item.image || null,
    readyInMinutes: item.readyInMinutes ?? null,
    servings: item.servings ?? null,
    calories: nutrientValue(nutrients, 'calories'),
    protein: nutrientValue(nutrients, 'protein'),
    carbs: nutrientValue(nutrients, 'carbs'),
    fat: nutrientValue(nutrients, 'fat'),
  };
}

function shapeRecipeDetail(item) {
  const base = shapeRecipeSummary(item);
  const ingredients = (item.extendedIngredients || []).map((ing) => ({
    name: ing.name || ing.original || '',
    amount: ing.amount ?? null,
    unit: ing.unit || '',
    original: ing.original || '',
  }));
  return {
    ...base,
    ingredients,
    instructions: stripHtml(item.instructions || ''),
    summary: stripHtml(item.summary || ''),
  };
}

function getApiKey(res) {
  const key = process.env.SPOONACULAR_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'Spoonacular API key not configured' });
    return null;
  }
  return key;
}

async function callSpoon(url, res) {
  let upstream;
  try {
    upstream = await fetch(url);
  } catch (err) {
    console.error('[recipes] fetch failed', err);
    res.status(502).json({ error: 'Spoonacular upstream unreachable' });
    return null;
  }
  if (!upstream.ok) {
    const body = await upstream.text().catch(() => '');
    console.error('[recipes] upstream error', upstream.status, body);
    res.status(502).json({ error: `Spoonacular upstream returned ${upstream.status}` });
    return null;
  }
  return upstream.json();
}

async function searchRecipes(req, res) {
  const apiKey = getApiKey(res);
  if (!apiKey) return;

  const params = {};
  const q = (req.query.q || '').trim();
  if (q) params.query = q;
  for (const key of ['cuisine', 'type', 'diet', 'intolerances']) {
    const v = (req.query[key] || '').trim();
    if (v) params[key] = v;
  }

  // Stable cache key — sort entries so {cuisine,query} and {query,cuisine}
  // collide, since they semantically should.
  const cacheKey = `search:${JSON.stringify(
    Object.entries(params).sort(([a], [b]) => a.localeCompare(b))
  )}`;
  const hit = cacheGet(cacheKey);
  if (hit) {
    console.log('[recipes cache HIT]', cacheKey);
    return res.json(hit);
  }
  console.log('[recipes cache MISS]', cacheKey);

  const url = new URL(`${SPOON_BASE}/complexSearch`);
  url.searchParams.set('apiKey', apiKey);
  url.searchParams.set('addRecipeNutrition', 'true');
  url.searchParams.set('number', String(RESULT_COUNT));
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const data = await callSpoon(url.toString(), res);
  if (!data) return;
  const payload = { recipes: (data.results || []).map(shapeRecipeSummary) };
  cacheSet(cacheKey, payload);
  res.json(payload);
}

async function randomRecipe(req, res) {
  const apiKey = getApiKey(res);
  if (!apiKey) return;

  const url = new URL(`${SPOON_BASE}/random`);
  url.searchParams.set('apiKey', apiKey);
  url.searchParams.set('number', '1');
  // /random doesn't return nutrition unless we explicitly ask for it.
  url.searchParams.set('includeNutrition', 'true');

  const tags = (req.query.tags || '').trim();
  if (tags) url.searchParams.set('include-tags', tags);

  const data = await callSpoon(url.toString(), res);
  if (!data) return;
  const first = (data.recipes || [])[0];
  if (!first) {
    return res.status(404).json({ error: 'No recipe found' });
  }
  res.json({ recipe: shapeRecipeSummary(first) });
}

async function getRecipeById(req, res) {
  const apiKey = getApiKey(res);
  if (!apiKey) return;

  const id = (req.params.id || '').trim();
  if (!id) return res.status(400).json({ error: 'id is required' });

  const cacheKey = `id:${id}`;
  const hit = cacheGet(cacheKey);
  if (hit) {
    console.log('[recipes cache HIT]', cacheKey);
    return res.json(hit);
  }
  console.log('[recipes cache MISS]', cacheKey);

  const url = new URL(`${SPOON_BASE}/${encodeURIComponent(id)}/information`);
  url.searchParams.set('apiKey', apiKey);
  url.searchParams.set('includeNutrition', 'true');

  const data = await callSpoon(url.toString(), res);
  if (!data) return;
  const payload = { recipe: shapeRecipeDetail(data) };
  cacheSet(cacheKey, payload);
  res.json(payload);
}

module.exports = { searchRecipes, randomRecipe, getRecipeById };
