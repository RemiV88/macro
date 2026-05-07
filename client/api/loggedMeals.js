import api from '../api';

export async function listLoggedMeals(date) {
  const res = await api.get('/logged-meals', { params: { date } });
  return res.data.loggedMeals;
}

export async function getLoggedMeal(id) {
  const res = await api.get(`/logged-meals/${id}`);
  return res.data.loggedMeal;
}

export async function createLoggedMeal(payload) {
  const res = await api.post('/logged-meals', payload);
  return res.data.loggedMeal;
}

export async function updateLoggedMeal(id, payload) {
  const res = await api.patch(`/logged-meals/${id}`, payload);
  return res.data.loggedMeal;
}

export async function deleteLoggedMeal(id) {
  const res = await api.delete(`/logged-meals/${id}`);
  return res.data;
}

export function localDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
