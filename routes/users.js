const express = require("express");
const User = require("../models/User");
const protect = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/users/search?username=xyz
// @desc    Username se user dhundo (jaise Teams mein hota hai)
// Sirf public info return hota hai - password kabhi nahi
router.get("/search", protect, async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || username.trim().length === 0) {
      return res.status(400).json({ message: "Search karne ke liye username do" });
    }

    const searchTerm = username.trim().toLowerCase();

    const users = await User.find({
      username: { $regex: searchTerm, $options: "i" },
      _id: { $ne: req.userId }, // apna khud ka result na aaye
    })
      .select("username displayName profilePic status isOnline")
      .limit(10);

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/users/me
// @desc    Apni profile dekho
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/users/me
// @desc    Apni profile update karo (displayName, status, profilePic)
router.put("/me", protect, async (req, res) => {
  try {
    const { displayName, status, profilePic, bio } = req.body;
    const user = await User.findById(req.userId);

    if (displayName) user.displayName = displayName;
    if (status) user.status = status;
    if (profilePic) user.profilePic = profilePic;
    if (bio !== undefined) user.bio = bio.slice(0, 140);

    await user.save();
    res.json({
      username: user.username,
      displayName: user.displayName,
      status: user.status,
      profilePic: user.profilePic,
      bio: user.bio,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
