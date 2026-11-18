import { withRequestAudit } from "@backend/http/request-handler";
import { PATCH as handlePATCH } from "@backend/http/products/handlers";

export const PATCH = withRequestAudit(handlePATCH);
