const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    profileImageUrl: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    onboardingComplete: {
      type: Boolean,
      default: false,
    },

    // Personal stats (filled by onboarding)
    age: { type: Number },
    gender: { type: String, enum: ['male', 'female'] },
    heightCm: { type: Number },
    weightKg: { type: Number },
    startingWeightKg: { type: Number },
    targetWeightKg: { type: Number, min: 0 },

    hasFitnessTracker: { type: Boolean },
    activityLevel: {
      type: String,
      enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'],
    },
    dailyBurnKcal: { type: Number },

    goal: { type: String, enum: ['lose', 'maintain', 'gain'] },

    // Calculated targets
    dailyCalorieTarget: { type: Number },
    proteinTarget: { type: Number },
    carbsTarget: { type: Number },
    fatTarget: { type: Number },
  },
  { timestamps: true }
);

// Hash password before save when modified.
// Mongoose 9 removed the `next` callback — pre hooks are async-only.
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Strip password whenever the user is serialized to JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
