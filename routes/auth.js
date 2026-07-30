const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendOtpEmail } = require("../utils/sendEmail");

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// @route   POST /api/auth/register
// @desc    Naya user banao - username, displayName, email, password
// Email sirf password reset ke liye use hoga, kisi doosre user ko nahi dikhega
router.post("/register", async (req, res) => {
  try {
    const { username, displayName, email, password } = req.body;

    if (!username || !displayName || !email || !password) {
      return res.status(400).json({ message: "Username, naam, email aur password zaroori hai" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Sahi email address daalo" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password kam se kam 6 characters ka hona chahiye" });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      return res.status(400).json({
        message: "Username sirf lowercase letters, numbers aur underscore (_) mein ho, 3-20 characters",
      });
    }

    const existingUser = await User.findOne({ username: cleanUsername });
    if (existingUser) {
      return res.status(400).json({ message: "Ye username pehle se liya jaa chuka hai" });
    }

    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(400).json({ message: "Ye email pehle se ek account mein use ho chuka hai" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username: cleanUsername,
      displayName: displayName.trim(),
      email: cleanEmail,
      password: hashedPassword,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        profilePic: user.profilePic,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error, baad mein try karo" });
  }
});

// @route   POST /api/auth/login
// @desc    Username + password se login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username aur password dono zaroori hai" });
    }

    const cleanUsername = username.trim().toLowerCase();
    const user = await User.findOne({ username: cleanUsername });

    if (!user) {
      return res.status(400).json({ message: "Username ya password galat hai" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Username ya password galat hai" });
    }

    user.isOnline = true;
    await user.save();

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        profilePic: user.profilePic,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error, baad mein try karo" });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Email pe 6-digit OTP bhejo password reset karne ke liye
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: "Sahi email address daalo" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    // Security ke liye: chahe email mile ya na mile, same message dete hain
    // (isse pata nahi chalta kaunsa email registered hai)
    if (!user) {
      return res.json({
        message: "Agar ye email registered hai, to OTP bhej diya gaya hai",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    user.resetOtpHash = otpHash;
    user.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minute
    await user.save();

    try {
      await sendOtpEmail(user.email, otp);
    } catch (emailErr) {
      console.error("Email bhejne mein error:", emailErr);
      return res.status(500).json({
        message: "OTP email bhejne mein dikkat aayi, thodi der baad try karo",
      });
    }

    res.json({ message: "Agar ye email registered hai, to OTP bhej diya gaya hai" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error, baad mein try karo" });
  }
});

// @route   POST /api/auth/reset-password
// @desc    OTP verify karke naya password set karo
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP aur naya password zaroori hai" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password kam se kam 6 characters ka hona chahiye" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user || !user.resetOtpHash || !user.resetOtpExpiry) {
      return res.status(400).json({ message: "OTP invalid ya expire ho chuka hai, dobara bhejwao" });
    }

    if (user.resetOtpExpiry < new Date()) {
      user.resetOtpHash = null;
      user.resetOtpExpiry = null;
      await user.save();
      return res.status(400).json({ message: "OTP expire ho chuka hai, dobara bhejwao" });
    }

    const isOtpValid = await bcrypt.compare(otp, user.resetOtpHash);
    if (!isOtpValid) {
      return res.status(400).json({ message: "OTP galat hai" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtpHash = null;
    user.resetOtpExpiry = null;
    await user.save();

    res.json({ message: "Password successfully reset ho gaya, ab login karo" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error, baad mein try karo" });
  }
});

module.exports = router;
