const Admin = require('../models/Admin');
const { sendWelcomeEmail } = require('../util/email');
const { log } = require('../util/logger');

// 1. Get all users
const getUsers = async (req, res) => {
  try {
    const users = await Admin.find();
    res.status(200).json({ users });
  } catch (error) {
    log(`[User Admin] Fetch users error: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 2. Create a new user
const createUser = async (req, res) => {
  try {
    const { username, email, role, permissions } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const emailLower = email.trim().toLowerCase();
    const emailExists = await Admin.findOne({ email: emailLower });
    if (emailExists) {
      return res.status(400).json({ message: "Email is already in use by another user" });
    }

    const newUser = new Admin({
      username,
      email: emailLower,
      role: role || 'Sub-Admin',
      permissions: permissions || {
        settingsAccess: 'no',
        quotationAccess: 'no',
        quotationAdd: 'no',
        quotationEdit: 'no',
        quotationDelete: 'no',
        productAccess: 'no',
        productAdd: 'no',
        productEdit: 'no',
        productDelete: 'no',
        requireAccess: 'no',
        requireAccessAdd: 'no',
        requireAccessEdit: 'no',
        requireAccessDelete: 'no',
        sparePartsAccess: 'no',
        sparePartsAdd: 'no',
        sparePartsEdit: 'no',
        sparePartsDelete: 'no'
      }
    });

    await newUser.save();

    // Send welcome email informing user account was created and to log in via OTP
    try {
      await sendWelcomeEmail(emailLower, username);
    } catch (emailErr) {
      log(`[User Admin] Welcome email delivery failed for ${emailLower}: ${emailErr.message}`);
    }

    log(`[User Admin] Created new user: ${emailLower} with username: ${username}`);

    res.status(201).json({
      message: "User created successfully. Welcome email has been sent.",
      user: newUser.toObject()
    });
  } catch (error) {
    log(`[User Admin] Create user error: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 3. Update user details
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role, permissions } = req.body;

    const user = await Admin.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.username === 'admin' && role !== 'Admin') {
      return res.status(400).json({ message: "Cannot change role of default administrator" });
    }

    // Validate email uniqueness if changed
    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      const emailExists = await Admin.findOne({ email: email.toLowerCase() });
      if (emailExists) {
        return res.status(400).json({ message: "Email is already in use by another account" });
      }
      user.email = email.toLowerCase();
    }

    if (role) user.role = role;
    if (permissions) user.permissions = permissions;

    await user.save();

    log(`[User Admin] Updated user: ${user.email}`);

    res.status(200).json({
      message: "User updated successfully",
      user: user.toObject()
    });
  } catch (error) {
    log(`[User Admin] Update user error: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 4. Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await Admin.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.username === 'admin') {
      return res.status(400).json({ message: "Cannot delete default administrator account" });
    }

    await Admin.findByIdAndDelete(id);

    log(`[User Admin] Deleted user: ${user.email}`);

    res.status(200).json({ message: `User "${user.username}" deleted successfully` });
  } catch (error) {
    log(`[User Admin] Delete user error: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser
};
