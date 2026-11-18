import { editUser } from "@backend/http/users/handlers";
import { withRequestAudit } from "@backend/http/request-handler";

export const PATCH = withRequestAudit(editUser);
export const DELETE = withRequestAudit(editUser);
