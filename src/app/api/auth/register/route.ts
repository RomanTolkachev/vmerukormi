import { register } from "@backend/http/auth/handlers";
import { withRequestAudit } from "@backend/http/request-handler";

export const POST = withRequestAudit(register);
