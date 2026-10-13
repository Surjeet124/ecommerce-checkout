const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    // Stored in paise (smallest INR unit): 249900 = Rs. 2499.00
    price: {
      type: Number,
      required: true,
      min: [100, 'Price must be at least 100 paise (Rs. 1)'],
      validate: {
        validator: Number.isInteger,
        message: 'Price must be a whole number of paise',
      },
    },
    image: { type: String, default: '', trim: true },
    category: { type: String, default: 'general', lowercase: true, trim: true },
    description: { type: String, default: '', maxlength: 1000 },
    stock: {
      type: Number,
      default: 0,
      min: 0,
      validate: { validator: Number.isInteger, message: 'Stock must be a whole number' },
    },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('Product', productSchema);
