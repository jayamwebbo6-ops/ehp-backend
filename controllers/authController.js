const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const { log } = require('../util/logger');
const { sendOtpEmail } = require('../util/email');

const isProd = process.env.NODE_ENV === 'production';
const COOKIE_OPTIONS = {
  httpOnly: true,                                          // JS cannot read this cookie — XSS safe
  secure: isProd,                                          // HTTPS only in production
  sameSite: isProd ? 'none' : 'lax',
  maxAge: 24 * 60 * 60 * 1000,                            // 1 day in ms
};

// Send Login OTP
const sendOtp = async (req, res) => {
  try {
    const email = req.body.email ? req.body.email.trim().toLowerCase() : "";
    if (!email) {
      return res.status(400).json({ message: "Email address is required" });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: "Account with this email not found" });
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    admin.loginOtp = {
      code: otp,
      expiresAt
    };
    await admin.save();

    await sendOtpEmail(admin.email, otp, expiryMinutes);

    log(`[Admin Auth] Sent login OTP to ${email}`);

    res.status(200).json({ message: "Verification code sent to your email" });
  } catch (error) {
    log(`[Admin Auth] Send OTP error: ${error.message}`);
    res.status(500).json({ message: "Failed to send verification code. Please try again later." });
  }
};

// Verify Login OTP & Complete Sign In
const verifyOtp = async (req, res) => {
  try {
    const email = req.body.email ? req.body.email.trim().toLowerCase() : "";
    const otp = req.body.otp ? req.body.otp.trim() : "";

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and verification code are required" });
    }

    const admin = await Admin.findOne({ email });
    if (!admin || !admin.loginOtp || admin.loginOtp.code !== otp) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    if (new Date() > admin.loginOtp.expiresAt) {
      return res.status(400).json({ message: "Verification code has expired" });
    }

    // Clear used OTP
    admin.loginOtp = {
      code: null,
      expiresAt: null
    };
    await admin.save();

    // Generate JWT
    const token = jwt.sign(
      {
        id: admin._id,
        email: admin.email,
        role: admin.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Set token as httpOnly cookie
    res.cookie("qg_token", token, COOKIE_OPTIONS);

    log(`[Admin Auth] Admin logged in successfully via OTP: ${email}`);

    res.status(200).json({
      message: "Logged in successfully",
      admin: admin.toObject(),
    });
  } catch (error) {
    log(`[Admin Auth] Verify OTP login error: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

const logout = (req, res) => {
  log(`[Admin Auth] Admin logged out`);
  res.clearCookie('qg_token', COOKIE_OPTIONS);
  res.status(200).json({ message: "Logged out successfully" });
};

const getMe = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);
    if (!admin) {
      return res.status(404).json({ message: "Admin profile not found" });
    }
    res.status(200).json({ admin });
  } catch (error) {
    log(`[Admin Auth] Fetch profile error: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const adminId = req.admin.id;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: "Administrator account not found" });
    }

    // Validate email uniqueness if changed
    if (email && email.toLowerCase() !== admin.email.toLowerCase()) {
      const emailExists = await Admin.findOne({ email: email.toLowerCase() });
      if (emailExists) {
        return res.status(400).json({ message: "Email is already in use by another account" });
      }
      admin.email = email.toLowerCase();
    }

    // Validate username uniqueness if changed
    if (name && name !== admin.username) {
      const usernameExists = await Admin.findOne({ username: name });
      if (usernameExists) {
        return res.status(400).json({ message: "Username is already in use by another account" });
      }
      admin.username = name;
    }

    await admin.save();

    log(`[Admin Auth] Profile updated successfully for: ${admin.email}`);

    res.status(200).json({
      message: "Profile updated successfully",
      admin: admin.toObject()
    });
  } catch (error) {
    log(`[Admin Auth] Update profile error: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  logout,
  getMe,
  updateProfile
};
