import { withRequestAudit } from "@backend/http/request-handler";
import { GET as handleGET, PATCH as handlePATCH, DELETE as handleDELETE } from "@backend/http/rations/id-handlers";

export const GET = withRequestAudit(handleGET);
export const PATCH = withRequestAudit(handlePATCH);
export const DELETE = withRequestAudit(handleDELETE);
