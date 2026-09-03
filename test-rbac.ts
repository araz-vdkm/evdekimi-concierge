import { isReservationAssignedToUser } from "./src/lib/villaMatcher.ts";

const adminUser = {
  email: "roman@evdekimi.com",
  role: "admin",
  assignedComplexes: [],
  assignedUnits: []
};

const report = {
  complexName: "HTN-001 | Hutan V",
  unitName: "",
  guestName: "WEIMING QIU",
  signature: "Kristina"
};

console.log("Admin can see:", isReservationAssignedToUser(report, adminUser));

const adminUserUndefined = {
  email: "roman@evdekimi.com",
  role: "admin"
};

console.log("Admin undefined can see:", isReservationAssignedToUser(report, adminUserUndefined as any));

