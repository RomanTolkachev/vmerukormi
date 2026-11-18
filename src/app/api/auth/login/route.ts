import { withRequestAudit } from "@backend/http/request-handler";
import { login } from "@backend/http/auth/handlers";

export const POST = withRequestAudit(login);

