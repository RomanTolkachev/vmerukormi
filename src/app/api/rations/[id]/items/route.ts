import { withRequestAudit } from "@backend/http/request-handler";
import { POST as handlePOST } from "@backend/http/rations/item-handlers";

export const POST = withRequestAudit(handlePOST);
