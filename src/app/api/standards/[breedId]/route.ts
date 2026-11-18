import { withRequestAudit } from "@backend/http/request-handler";
import { PUT as handlePUT } from "@backend/http/standards/id-handlers";

export const PUT = withRequestAudit(handlePUT);
