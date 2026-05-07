const mongoose = require('mongoose');

const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];

// Items are stored as snapshots: foodName + per-100g macros are the source of
// truth on the template. foodId is an optional back-link to the user's food
// library — null for items added via USDA search (which we do NOT auto-save to
// the library). Old documents may lack the inline fields; the controller's
// read-time normalizer backfills from the populated foodId.
const templateItemSchema = new mongoose.Schema(
  {
    foodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Food',
      default: null,
    },
    foodName: {
      type: String,
      required: true,
      trim: true,
    },
    caloriesPer100g: { type: Number, required: true, min: 0 },
    proteinPer100g: { type: Number, required: true, min: 0 },
    carbsPer100g: { type: Number, required: true, min: 0 },
    fatPer100g: { type: Number, required: true, min: 0 },
    portionGrams: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true }
);

const mealTemplateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mealSlot: {
      type: String,
      enum: MEAL_SLOTS,
      required: true,
    },
    items: {
      type: [templateItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

mealTemplateSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('MealTemplate', mealTemplateSchema);
module.exports.MEAL_SLOTS = MEAL_SLOTS;
