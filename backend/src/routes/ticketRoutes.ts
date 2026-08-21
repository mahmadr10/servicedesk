import { Router } from "express";
import * as ticketController from "../controllers/ticketController";
import * as commentController from "../controllers/commentController";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createTicketSchema,
  listTicketsQuerySchema,
  updateStatusSchema,
  mongoIdParamSchema,
} from "../validators/ticketValidators";
import { createCommentSchema } from "../validators/commentValidators";

const router = Router();

// Every ticket route requires SOME logged-in user; specific routes further
// restrict by role below. This two-layer check (requireAuth then
// requireRole) mirrors the two questions "who are you?" / "are you allowed?"
router.use(requireAuth);

// Only customers create tickets (per spec: agents don't file tickets).
router.post("/", requireRole("CUSTOMER"), validate(createTicketSchema), ticketController.createTicket);

// Both roles can list — the service itself restricts customers to their own tickets.
router.get("/", validate(listTicketsQuerySchema, "query"), ticketController.listTickets);

router.get("/:id", validate(mongoIdParamSchema, "params"), ticketController.getTicket);

// Only agents change ticket status.
router.patch(
  "/:id/status",
  requireRole("AGENT"),
  validate(mongoIdParamSchema, "params"),
  validate(updateStatusSchema),
  ticketController.updateStatus
);

// Only agents assign tickets to themselves.
router.post(
  "/:id/assign",
  requireRole("AGENT"),
  validate(mongoIdParamSchema, "params"),
  ticketController.assignToSelf
);

// Comments are a sub-resource of a ticket. Both customer and agent can post,
// as long as they're allowed to see the ticket (checked in the service).
router.get("/:id/comments", validate(mongoIdParamSchema, "params"), commentController.listComments);
router.post(
  "/:id/comments",
  validate(mongoIdParamSchema, "params"),
  validate(createCommentSchema),
  commentController.addComment
);

export default router;
