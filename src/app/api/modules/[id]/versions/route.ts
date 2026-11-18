import { withRequestAudit } from "@backend/http/request-handler";
import { POST as handlePOST } from "@backend/http/modules/version-handlers";

export const POST = withRequestAudit(handlePOST);
