import express from "express";
import {
    getAllPatients,
    getAllDoctors,
    getUserStats,
    
    
    createDoctorUser,
    createHospitalUser,
    getPatientsPaginated,
    getHospitalsPaginated,
    getDoctorsByHospitalPaginated,
    getAdminPatientById,
    getHospitalByIdAdmin,
    getAdminDoctorById
} from "../controllers/adminController.js";
import { verifyToken, allowRoles } from "../middleware/authMiddleware.js";
import {
  createInsuranceProvider,
  getAllInsuranceProviders,
  updateInsuranceProvider,
  deleteInsuranceProvider,
  
} from "../controllers/insuranceController.js";
const router = express.Router();

// All routes require authentication and ADMIN role
router.get("/patients", verifyToken, allowRoles("ADMIN"), getAllPatients);
router.get("/doctors", verifyToken, allowRoles("ADMIN"), getAllDoctors);
router.get("/stats", verifyToken, allowRoles("ADMIN"), getUserStats);
router.post("/create-doctor", verifyToken, allowRoles("ADMIN"), createDoctorUser);

router.post("/create-hospital", verifyToken, allowRoles("ADMIN"), createHospitalUser);
// Insurance Provider Management
router.post("/insurance-providers", verifyToken, allowRoles("ADMIN"), createInsuranceProvider);
router.get("/insurance-providers", verifyToken, allowRoles("ADMIN"), getAllInsuranceProviders);
router.put("/insurance-providers/:id", verifyToken, allowRoles("ADMIN"), updateInsuranceProvider);
router.delete("/insurance-providers/:id", verifyToken, allowRoles("ADMIN")  , deleteInsuranceProvider);

router.get("/patients/paginated", verifyToken, allowRoles("ADMIN"), getPatientsPaginated);
router.get("/hospitals/paginated", verifyToken, allowRoles("ADMIN"), getHospitalsPaginated);
router.get("/doctors-by-hospital/paginated", verifyToken, allowRoles("ADMIN"), getDoctorsByHospitalPaginated);
router.get("/patients/:id", verifyToken, allowRoles("ADMIN"), getAdminPatientById);
router.get(
  "/hospitals/:id",
  verifyToken,
  allowRoles("ADMIN"),
  getHospitalByIdAdmin
);
router.get(
  "/doctors/:id",
  verifyToken,
  allowRoles("ADMIN"),
  getAdminDoctorById
);

export default router;





// All routes are admin protected
