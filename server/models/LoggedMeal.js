const mongoose = require('mongoose');

const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];

const loggedItemSchema = new mongoose.Schema(
  {
    foodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Food',
    },
    foodName: {
      type: String,
      required: true,
      trim: true,
    },
    portionGrams: {
      type: Number,
      required: true,
      min: 0,
    },
    caloriesPer100g: { type: Number, required: true, min: 0 },
    proteinPer100g: { type: Number, required: true, min: 0 },
    carbsPer100g: { type: Number, required: true, min: 0 },
    fatPer100g: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const loggedMealSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    mealSlot: {
      type: String,
      enum: MEAL_SLOTS,
      required: true,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MealTemplate',
      default: null,
    },
    items: {
      type: [loggedItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

loggedMealSchema.index({ userId: 1, date: 1 });

loggedMealSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('LoggedMeal', loggedMealSchema);
module.exports.MEAL_SLOTS = MEAL_SLOTS;
