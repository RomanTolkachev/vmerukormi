import { withRequestAudit } from "@backend/http/request-handler";
import { DELETE as handleDELETE } from "@backend/http/calculations/id-handlers";

export const DELETE = withRequestAudit(handleDELETE);
