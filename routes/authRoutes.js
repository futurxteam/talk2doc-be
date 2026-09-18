import express from "express";
import { signup, login, verifyOTP } from "../controllers/authController.js";
import { getPublicInsuranceProviders } from "../controllers/insuranceController.js";
const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/verify-otp", verifyOTP);
router.get("/insurance-providers", getPublicInsuranceProviders);
export default router;
