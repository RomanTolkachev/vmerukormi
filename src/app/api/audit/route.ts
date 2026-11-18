import { listAudit } from "@backend/http/audit/handlers";
import { withRequestAudit } from "@backend/http/request-handler";

export const GET = withRequestAudit(listAudit);
