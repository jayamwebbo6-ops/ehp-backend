const Admin = require('../models/Admin');
const { log } = require('./logger');

// Seed default administrator if none exists
const seedAdmin = async () => {
  try {
    const count = await Admin.countDocuments();
    if (count === 0) {
      const defaultAdmin = new Admin({
        username: 'admin',
        email: 'jayamproj@gmail.com',
        role: 'Admin',
        permissions: {
          settingsAccess: 'yes',
          quotationAccess: 'yes',
          quotationAdd: 'yes',
          quotationEdit: 'yes',
          quotationDelete: 'yes',
          productAccess: 'yes',
          productAdd: 'yes',
          productEdit: 'yes',
          productDelete: 'yes'
        }
      });
      await defaultAdmin.save();
      console.log('[Admin Auth] Seeded default administrator account successfully.');
      log('[Admin Auth] Seeded default administrator account successfully.');
    } else {
      console.log(`[Admin Auth] Admin account already exists. Total admins: ${count}`);
      log(`[Admin Auth] Admin account already exists. Total admins: ${count}`);
    }
  } catch (error) {
    console.error(`[Admin Auth] Seeding error: ${error.message}`);
    log(`[Admin Auth] Seeding error: ${error.message}`);
  }
};

module.exports = { seedAdmin };