import { withRequestAudit } from "@backend/http/request-handler";
import { PATCH as handlePATCH } from "@backend/http/modules/id-handlers";

export const PATCH = withRequestAudit(handlePATCH);
