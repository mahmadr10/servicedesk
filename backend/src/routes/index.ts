import { Router } from "express";
import authRoutes from "./authRoutes";
import ticketRoutes from "./ticketRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/tickets", ticketRoutes);

export default router;
