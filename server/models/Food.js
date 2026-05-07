const mongoose = require('mongoose');

const CATEGORIES = ['meat', 'fish', 'carbs', 'veg', 'fruit', 'drink', 'snack', 'other'];

const foodSchema = new mongoose.Schema(
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
    category: {
      type: String,
      enum: CATEGORIES,
      required: true,
    },
    caloriesPer100g: { type: Number, required: true, min: 0 },
    proteinPer100g: { type: Number, required: true, min: 0 },
    carbsPer100g: { type: Number, required: true, min: 0 },
    fatPer100g: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

foodSchema.index({ userId: 1, name: 1 });

foodSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Food', foodSchema);
module.exports.CATEGORIES = CATEGORIES;
