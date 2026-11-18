import { withRequestAudit } from "@backend/http/request-handler";
import { PATCH as handlePATCH, DELETE as handleDELETE } from "@backend/http/rations/item-id-handlers";

export const PATCH = withRequestAudit(handlePATCH);
export const DELETE = withRequestAudit(handleDELETE);
