import api from '../api';

export async function listFoods() {
  const res = await api.get('/foods');
  return res.data.foods;
}

export async function getFood(id) {
  const res = await api.get(`/foods/${id}`);
  return res.data.food;
}

export async function createFood(payload) {
  const res = await api.post('/foods', payload);
  return res.data.food;
}

export async function updateFood(id, payload) {
  const res = await api.patch(`/foods/${id}`, payload);
  return res.data.food;
}

export async function deleteFood(id) {
  const res = await api.delete(`/foods/${id}`);
  return res.data;
}

export const FOOD_CATEGORIES = ['meat', 'fish', 'carbs', 'veg', 'fruit', 'drink', 'snack', 'other'];
