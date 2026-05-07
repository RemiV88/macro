require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const foodRoutes = require('./routes/foods');
const usdaRoutes = require('./routes/usda');
const mealTemplateRoutes = require('./routes/mealTemplates');
const loggedMealRoutes = require('./routes/loggedMeals');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/usda', usdaRoutes);
app.use('/api/meal-templates', mealTemplateRoutes);
app.use('/api/logged-meals', loggedMealRoutes);

// Centralized error handler — surfaces async errors as JSON.
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

const PORT = process.env.PORT || 5001;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
