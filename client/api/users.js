import api from '../api';

// PATCH /api/users/me — only name + profileImageUrl. Stats are guarded
// server-side; trying to send anything else returns 400.
export async function updateMe(payload) {
  const res = await api.patch('/users/me', payload);
  return res.data.user;
}
