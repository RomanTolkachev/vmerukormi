import { withRequestAudit } from "@backend/http/request-handler";
import { POST as handlePOST } from "@backend/http/modules/validate-handler";

export const POST = withRequestAudit(handlePOST);
