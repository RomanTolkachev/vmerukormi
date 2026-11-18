import { withRequestAudit } from "@backend/http/request-handler";
import { logout } from "@backend/http/auth/handlers";

export const POST = withRequestAudit(logout);

