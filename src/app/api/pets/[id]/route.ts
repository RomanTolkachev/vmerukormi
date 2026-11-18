import { withRequestAudit } from "@backend/http/request-handler";
import { DELETE as handleDELETE, PATCH as handlePATCH } from "@backend/http/pets/id-handlers";

export const DELETE = withRequestAudit(handleDELETE);
export const PATCH = withRequestAudit(handlePATCH);
