import { withRequestAudit } from "@backend/http/request-handler";
import { GET as handleGET, POST as handlePOST } from "@backend/http/rations/handlers";

export const GET = withRequestAudit(handleGET);
export const POST = withRequestAudit(handlePOST);
