import { Router } from "express";
import authRoutes from "./authRoutes";
import ticketRoutes from "./ticketRoutes";
import adminRoutes from "./adminRoutes";
import auditLogRoutes from "./auditLogRoutes";
import dashboardRoutes from "./dashboardRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/tickets", ticketRoutes);
router.use("/admin", adminRoutes);
router.use("/audit-logs", auditLogRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
