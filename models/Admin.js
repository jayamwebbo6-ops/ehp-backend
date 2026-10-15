const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  role: {
    type: String,
    enum: ['Admin', 'Sub-Admin'],
    default: 'Sub-Admin'
  },
  permissions: {
    settingsAccess: { type: String, default: 'no' },
    quotationAccess: { type: String, default: 'no' },
    quotationAdd: { type: String, default: 'no' },
    quotationEdit: { type: String, default: 'no' },
    quotationDelete: { type: String, default: 'no' },
    productAccess: { type: String, default: 'no' },
    productAdd: { type: String, default: 'no' },
    productEdit: { type: String, default: 'no' },
    productDelete: { type: String, default: 'no' },
    requireAccess : { type:String, default: 'no'},
    requireAccessAdd : { type:String, default: 'no'},
    requireAccessEdit : { type:String, default: 'no'},
    requireAccessDelete : { type:String, default: 'no'},
    sparePartsAccess: { type: String, default: 'no' },
    sparePartsAdd: { type: String, default: 'no' },
    sparePartsEdit: { type: String, default: 'no' },
    sparePartsDelete: { type: String, default: 'no' }
  },
  loginOtp: {
    code: { type: String, default: null },
    expiresAt: { type: Date, default: null }
  }
}, { timestamps: true });

module.exports = mongoose.model('Admin', AdminSchema);
