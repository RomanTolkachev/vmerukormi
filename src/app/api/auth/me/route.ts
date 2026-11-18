import { withRequestAudit } from "@backend/http/request-handler";
import { me } from "@backend/http/auth/handlers";

export const GET = withRequestAudit(me);
