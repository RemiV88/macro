const User = require('../models/User');

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_ADJUSTMENT = {
  lose: -500,
  maintain: 0,
  gain: 300,
};

function calculateTargets({ age, gender, heightCm, weightKg, hasFitnessTracker, activityLevel, dailyBurnKcal, goal }) {
  const bmr =
    gender === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  const tdee = hasFitnessTracker ? Number(dailyBurnKcal) : bmr * ACTIVITY_MULTIPLIERS[activityLevel];

  const dailyCalorieTarget = Math.round(tdee + GOAL_ADJUSTMENT[goal]);

  const proteinTarget = Math.round(weightKg * 1.8); // grams
  const fatTarget = Math.round((dailyCalorieTarget * 0.25) / 9); // grams (9 kcal/g)
  const carbsTarget = Math.round((dailyCalorieTarget - proteinTarget * 4 - fatTarget * 9) / 4); // grams

  return { dailyCalorieTarget, proteinTarget, carbsTarget, fatTarget };
}

async function updateOnboarding(req, res) {
  const {
    age,
    gender,
    heightCm,
    weightKg,
    hasFitnessTracker,
    activityLevel,
    dailyBurnKcal,
    goal,
  } = req.body || {};

  // Basic validation
  if (
    age == null ||
    !gender ||
    heightCm == null ||
    weightKg == null ||
    hasFitnessTracker == null ||
    !goal
  ) {
    return res.status(400).json({ error: 'Missing required onboarding fields' });
  }
  if (!['male', 'female'].includes(gender)) {
    return res.status(400).json({ error: 'gender must be male or female' });
  }
  if (!['lose', 'maintain', 'gain'].includes(goal)) {
    return res.status(400).json({ error: 'goal must be lose, maintain, or gain' });
  }
  if (hasFitnessTracker) {
    if (dailyBurnKcal == null) {
      return res.status(400).json({ error: 'dailyBurnKcal is required when hasFitnessTracker is true' });
    }
  } else {
    if (!ACTIVITY_MULTIPLIERS[activityLevel]) {
      return res.status(400).json({ error: 'activityLevel is required when hasFitnessTracker is false' });
    }
  }

  const targets = calculateTargets({
    age,
    gender,
    heightCm,
    weightKg,
    hasFitnessTracker,
    activityLevel,
    dailyBurnKcal,
    goal,
  });

  const user = req.user;
  user.age = age;
  user.gender = gender;
  user.heightCm = heightCm;
  user.weightKg = weightKg;
  user.hasFitnessTracker = hasFitnessTracker;
  user.activityLevel = hasFitnessTracker ? undefined : activityLevel;
  user.dailyBurnKcal = hasFitnessTracker ? dailyBurnKcal : undefined;
  user.goal = goal;
  user.dailyCalorieTarget = targets.dailyCalorieTarget;
  user.proteinTarget = targets.proteinTarget;
  user.carbsTarget = targets.carbsTarget;
  user.fatTarget = targets.fatTarget;

  // Only set startingWeightKg the first time onboarding is completed
  if (!user.onboardingComplete || user.startingWeightKg == null) {
    user.startingWeightKg = weightKg;
  }
  user.onboardingComplete = true;

  await user.save();
  res.json({ user });
}

// Profile edit — name + avatar only. Stats live behind the onboarding flow
// (PATCH /users/me/onboarding) and we don't want a separate path in here that
// would let a client mutate a single stat in isolation, since that would skip
// target recalculation. So we strictly allow-list the two fields and reject
// the request if any other key shows up in the body.
const ALLOWED_PROFILE_FIELDS = new Set(['name', 'profileImageUrl']);

async function updateMe(req, res) {
  const body = req.body || {};

  for (const key of Object.keys(body)) {
    if (!ALLOWED_PROFILE_FIELDS.has(key)) {
      return res.status(400).json({
        error: `Field "${key}" cannot be updated here. Only name and profileImageUrl are editable.`,
      });
    }
  }

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return res.status(400).json({ error: 'name must be a non-empty string' });
    }
  }

  if (body.profileImageUrl !== undefined) {
    if (body.profileImageUrl !== null && typeof body.profileImageUrl !== 'string') {
      return res.status(400).json({ error: 'profileImageUrl must be a string or null' });
    }
  }

  const user = req.user;
  if (body.name !== undefined) user.name = body.name.trim();
  if (body.profileImageUrl !== undefined) user.profileImageUrl = body.profileImageUrl;

  await user.save();
  res.json({ user });
}

module.exports = { updateOnboarding, updateMe };
