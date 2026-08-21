import { SLAPolicy } from "../models/SLAPolicy";
import { TicketPriority } from "../models/Ticket";

export function findPolicyForPriority(priority: TicketPriority) {
  return SLAPolicy.findOne({ priority });
}

export function listPolicies() {
  return SLAPolicy.find().sort({ priority: 1 });
}

export function upsertPolicy(priority: TicketPriority, responseMinutes: number, resolutionMinutes: number) {
  return SLAPolicy.findOneAndUpdate(
    { priority },
    { responseMinutes, resolutionMinutes },
    { upsert: true, returnDocument: "after" }
  );
}
