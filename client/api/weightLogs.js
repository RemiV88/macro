import api from '../api';

export async function listWeightLogs() {
  const res = await api.get('/weight-logs');
  return res.data.weightLogs;
}

export async function createWeightLog(payload) {
  const res = await api.post('/weight-logs', payload);
  return res.data.weightLog;
}

export async function deleteWeightLog(id) {
  const res = await api.delete(`/weight-logs/${id}`);
  return res.data;
}
