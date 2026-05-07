const mongoose = require('mongoose');
const WeightLog = require('../models/WeightLog');
const User = require('../models/User');

// Parse YYYY-MM-DD into a UTC start-of-day Date. Returns null if invalid.
function parseLocalDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return date;
}

function startOfTodayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

async function listWeightLogs(req, res) {
  const logs = await WeightLog.find({ userId: req.user._id }).sort({ date: 1 });
  res.json({ weightLogs: logs });
}

async function createWeightLog(req, res) {
  const body = req.body || {};

  const weight = Number(body.weightKg);
  if (!Number.isFinite(weight) || weight <= 0) {
    return res.status(400).json({ error: 'weightKg must be greater than 0' });
  }

  let date;
  if (body.date === undefined || body.date === null || body.date === '') {
    date = startOfTodayUTC();
  } else {
    date = parseLocalDate(body.date);
    if (!date) {
      return res.status(400).json({ error: 'date must be a YYYY-MM-DD string' });
    }
  }

  // Same-day overwrite — upsert by (userId, date).
  const next = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  let log = await WeightLog.findOne({
    userId: req.user._id,
    date: { $gte: date, $lt: next },
  });

  if (log) {
    log.weightKg = weight;
    log.date = date;
    await log.save();
  } else {
    log = await WeightLog.create({
      userId: req.user._id,
      weightKg: weight,
      date,
    });
  }

  // Keep User.weightKg in sync with the most recent log so the rest of the app
  // (profile, targets) reflects the latest weigh-in. We re-query so we always
  // honor the latest-by-date entry rather than naively trusting the new one.
  const latest = await WeightLog.findOne({ userId: req.user._id }).sort({ date: -1 });
  if (latest) {
    await User.updateOne({ _id: req.user._id }, { $set: { weightKg: latest.weightKg } });
  }

  res.status(log.isNew ? 201 : 200).json({ weightLog: log });
}

async function deleteWeightLog(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'Weight log not found' });
  }
  const log = await WeightLog.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!log) return res.status(404).json({ error: 'Weight log not found' });

  // Re-sync user weight to whatever the latest remaining log is (or leave as-is
  // if no logs remain — we don't want to wipe the onboarding-supplied weight).
  const latest = await WeightLog.findOne({ userId: req.user._id }).sort({ date: -1 });
  if (latest) {
    await User.updateOne({ _id: req.user._id }, { $set: { weightKg: latest.weightKg } });
  }

  res.json({ ok: true });
}

module.exports = {
  listWeightLogs,
  createWeightLog,
  deleteWeightLog,
};
