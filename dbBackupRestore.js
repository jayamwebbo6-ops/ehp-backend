const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const connectDB = require('./config/db');

// Import Models
const Admin = require('./models/Admin');
const Product = require('./models/Product');
const Quotation = require('./models/Quotation');
const Setting = require('./models/Setting');

const BACKUP_DIR = path.join(__dirname, 'backups');

const ensureBackupDir = () => {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
};

const backup = async () => {
  console.log('🔄 Starting database backup...');
  try {
    ensureBackupDir();
    
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      admins: await Admin.find({}).lean(),
      products: await Product.find({}).lean(),
      quotations: await Quotation.find({}).lean(),
      settings: await Setting.find({}).lean(),
    };

    const filename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(BACKUP_DIR, filename);

    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2), 'utf-8');
    console.log(`✅ Backup successfully saved to: ${filepath}`);
    console.log(`📊 Statistics:`);
    console.log(`   - Admins: ${backupData.admins.length}`);
    console.log(`   - Products: ${backupData.products.length}`);
    console.log(`   - Quotations: ${backupData.quotations.length}`);
    console.log(`   - Settings: ${backupData.settings.length}`);
  } catch (error) {
    console.error('❌ Backup failed:', error);
  }
};

const restore = async (filename) => {
  if (!filename) {
    console.error('❌ Error: Please specify the backup filename or path to restore.');
    console.log('Usage: node dbBackupRestore.js --import <filename_or_path>');
    return;
  }

  let filepath = filename;
  if (!fs.existsSync(filepath)) {
    // Try in backups folder
    filepath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filepath)) {
      console.error(`❌ Error: Backup file not found at "${filename}" or "${filepath}"`);
      return;
    }
  }

  console.log(`🔄 Reading backup file from: ${filepath}...`);
  try {
    const rawData = fs.readFileSync(filepath, 'utf-8');
    const backupData = JSON.parse(rawData);

    if (!backupData || typeof backupData !== 'object') {
      throw new Error('Invalid JSON format');
    }

    if (!backupData.products && !backupData.quotations && !backupData.settings) {
      throw new Error('Invalid backup file structure: Missing critical collections');
    }

    console.log('⚠️ WARNING: This will overwrite your existing database records! Starting import...');

    // 1. Settings
    if (backupData.settings && Array.isArray(backupData.settings)) {
      await Setting.deleteMany({});
      if (backupData.settings.length > 0) {
        await Setting.insertMany(backupData.settings);
        console.log(`   - Settings restored: ${backupData.settings.length}`);
      }
    }

    // 2. Products
    if (backupData.products && Array.isArray(backupData.products)) {
      await Product.deleteMany({});
      if (backupData.products.length > 0) {
        await Product.insertMany(backupData.products);
        console.log(`   - Products restored: ${backupData.products.length}`);
      }
    }

    // 3. Quotations
    if (backupData.quotations && Array.isArray(backupData.quotations)) {
      await Quotation.deleteMany({});
      if (backupData.quotations.length > 0) {
        await Quotation.insertMany(backupData.quotations);
        console.log(`   - Quotations restored: ${backupData.quotations.length}`);
      }
    }

    // 4. Admins
    if (backupData.admins && Array.isArray(backupData.admins)) {
      await Admin.deleteMany({});
      if (backupData.admins.length > 0) {
        await Admin.insertMany(backupData.admins);
        console.log(`   - Admins restored: ${backupData.admins.length}`);
      }
    }

    console.log('✅ Database restoration completed successfully!');
  } catch (error) {
    console.error('❌ Restoration failed:', error.message);
  }
};

const run = async () => {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === '--backup' || command === '-b') {
    await connectDB();
    await backup();
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
    process.exit(0);
  } else if (command === '--import' || command === '-i') {
    await connectDB();
    await restore(args[1]);
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
    process.exit(0);
  } else {
    console.log(`
Database Backup & Restore Utility
=================================
Usage:
  Backup:
    node dbBackupRestore.js --backup
    node dbBackupRestore.js -b

  Import / Restore:
    node dbBackupRestore.js --import <filename_or_path>
    node dbBackupRestore.js -i <filename_or_path>

  Note: Backup files are stored in the "./backups" directory.
`);
    process.exit(0);
  }
};

run();
