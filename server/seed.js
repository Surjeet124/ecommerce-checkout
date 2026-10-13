// Run once after setting up .env:  npm run seed
// - creates the first admin account (from ADMIN_* in .env) if it does not exist
// - adds a few sample products if the products collection is empty
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Product = require('./models/Product');

const sampleProducts = [
  {
    name: 'Wireless Headphones',
    price: 249900,
    category: 'audio',
    stock: 25,
    description: 'Over-ear Bluetooth headphones with a long battery life.',
    image: 'https://images.unsplash.com/photo-1641048930621-ab5d225ae5b0?w=600&auto=format&fit=crop&q=60',
  },
  {
    name: 'Mechanical Keyboard',
    price: 399900,
    category: 'accessories',
    stock: 15,
    description: 'Tactile mechanical keyboard with a compact layout.',
    image: 'https://plus.unsplash.com/premium_photo-1664194583917-b0ba07c4ce2a?w=600&auto=format&fit=crop&q=60',
  },
  {
    name: 'Smart Watch',
    price: 549900,
    category: 'wearables',
    stock: 10,
    description: 'Fitness and notification tracking on your wrist.',
    image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&auto=format&fit=crop&q=60',
  },
  {
    name: 'Backpack',
    price: 189900,
    category: 'bags',
    stock: 30,
    description: 'Everyday backpack with a padded laptop sleeve.',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=60',
  },
];

async function seed() {
  await connectDB();

  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
    if (existing) {
      console.log(`Admin account already exists: ${ADMIN_EMAIL}`);
    } else {
      await User.create({
        name: ADMIN_NAME || 'Admin',
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: 'admin',
      });
      console.log(`Admin account created: ${ADMIN_EMAIL}`);
    }
  } else {
    console.log('ADMIN_EMAIL / ADMIN_PASSWORD not set, skipping admin creation');
  }

  if ((await Product.countDocuments()) === 0) {
    await Product.insertMany(sampleProducts);
    console.log(`Added ${sampleProducts.length} sample products`);
  } else {
    console.log('Products already exist, skipping sample products');
  }
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
