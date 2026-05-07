import api from '../api';

export async function listMealTemplates() {
  const res = await api.get('/meal-templates');
  return res.data.templates;
}

export async function getMealTemplate(id) {
  const res = await api.get(`/meal-templates/${id}`);
  return res.data.template;
}

export async function createMealTemplate(payload) {
  const res = await api.post('/meal-templates', payload);
  return res.data.template;
}

export async function updateMealTemplate(id, payload) {
  const res = await api.patch(`/meal-templates/${id}`, payload);
  return res.data.template;
}

export async function deleteMealTemplate(id) {
  const res = await api.delete(`/meal-templates/${id}`);
  return res.data;
}

export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];
