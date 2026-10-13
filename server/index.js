require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 4242;

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '100kb' }));

app.get('/', (req, res) => res.send('E-commerce API running.'));
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));

app.use(notFound);
app.use(errorHandler);

// Exported so the app can be tested without opening a port
module.exports = app;

if (require.main === module) {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set. Add it to server/.env');
    process.exit(1);
  }

  connectDB()
    .then(() => {
      app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
    })
    .catch((err) => {
      console.error('Failed to start:', err.message);
      process.exit(1);
    });
}
