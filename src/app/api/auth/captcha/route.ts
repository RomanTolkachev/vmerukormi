import { captcha } from "@backend/http/auth/handlers";
import { withRequestAudit } from "@backend/http/request-handler";

export const GET = withRequestAudit(captcha);
