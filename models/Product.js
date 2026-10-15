const mongoose = require('mongoose');

const AccessorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  image: {
    type: String,
    trim: true,
    default: ''
  },
  price: {
    type: Number,
    min: 0,
    default: 0
  },
  websiteUrl: {
    type: String,
    trim: true,
    default: ''
  },
  youtubeUrl: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: true });

const OptionalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  image: {
    type: String,
    trim: true,
    default: ''
  },
  price: {
    type: Number,
    min: 0,
    default: 0
  },
  websiteUrl: {
    type: String,
    trim: true,
    default: ''
  },
  youtubeUrl: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: true });

const TechnicalDataSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    default: ''
  },
  value: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: true });

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  unitPrice: {
    type: Number,
    min: 0
  },
  currency: {
    type: String,
    enum: ['INR', 'EUR'],
    default: 'INR'
  },
  websiteUrl: {
    type: String,
    trim: true,
    default: ''
  },
  youtubeUrl: {
    type: String,
    trim: true,
    default: ''
  },
  technicalData: [TechnicalDataSchema],
  accessories: [AccessorySchema],
  optionals: [OptionalSchema]
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);
