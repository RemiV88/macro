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
const weightLogRoutes = require('./routes/weightLogs');
const recipeRoutes = require('./routes/recipes');

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
app.use('/api/weight-logs', weightLogRoutes);
app.use('/api/recipes', recipeRoutes);

// Centralized error handler — surfaces async errors as JSON.
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

const PORT = process.env.PORT || 5001;

connectDB().then(() => {
module.exports = app;
// And for development only start the server if we're not in a serverless environment
// This will only happen locally in development mode
if (process.env.NODE_ENV !== 'production') {
  // Start the server
  const port = process.env.PORT || 4444;
  app.listen(port, () => console.log("🚀 Listening on port: " + port + " 🚀"));
}
});
