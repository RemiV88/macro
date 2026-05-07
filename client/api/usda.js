import api from '../api';

export async function searchUsda(q) {
  const res = await api.get('/usda/search', { params: { q } });
  return res.data.foods;
}
