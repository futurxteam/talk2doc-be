import jwt from "jsonwebtoken";
import User from "../models/User.js";

const SECRET_KEY = process.env.JWT_SECRET || "secretkey";

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, SECRET_KEY);

    const user = await User.findById(decoded.id).select("-__v -updatedAt");
    if (!user) return res.status(404).json({ error: "User not found" });

    req.user = user; // ✅ full user object with role
    next();
  } catch (err) {
    // Return 401 cleanly without dumping stack trace
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
export const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    next();
  };
};
