import type { Booking, Organization } from "@prisma/client";
import type { CurrentUser } from "./auth";

type B = Pick<Booking, "organizerId" | "createdById" | "restaurantId"> & { restaurant?: Pick<Organization, "agentId"> };

export function bookingRole(user: CurrentUser, b: B): "admin" | "organizer" | "restaurant" | "agent" | null {
  if (user.role === "ADMIN") return "admin";
  if (user.role === "ORGANIZER" && (b.createdById === user.id || (b.organizerId && b.organizerId === user.organizationId))) return "organizer";
  if (user.role === "RESTAURANT" && user.organizationId === b.restaurantId) return "restaurant";
  if (user.role === "AGENT" && b.restaurant?.agentId === user.id) return "agent";
  return null;
}
