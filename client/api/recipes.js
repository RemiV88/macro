import api from '../api';

// params: { q, cuisine, type, diet, intolerances } — only set fields are sent.
export async function searchRecipes(params = {}) {
  const clean = {};
  for (const k of ['q', 'cuisine', 'type', 'diet', 'intolerances']) {
    const v = params[k];
    if (v != null && String(v).trim() !== '') clean[k] = v;
  }
  const res = await api.get('/recipes/search', { params: clean });
  return res.data.recipes;
}

export async function randomRecipe(tagsArray = []) {
  const tags = (tagsArray || []).filter(Boolean).join(',');
  const res = await api.get('/recipes/random', { params: tags ? { tags } : {} });
  return res.data.recipe;
}

export async function getRecipe(id) {
  const res = await api.get(`/recipes/${id}`);
  return res.data.recipe;
}
