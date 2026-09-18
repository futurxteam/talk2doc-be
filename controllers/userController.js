export const getUserProfile = async (req, res) => {
  try {
    // req.user is already attached by middleware
    res.json({
      success: true,
      user: req.user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
