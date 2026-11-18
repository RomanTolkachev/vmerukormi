import { POST as createTag } from "@backend/http/product-tags/handlers";
import { withRequestAudit } from "@backend/http/request-handler";

export const POST = withRequestAudit(createTag);
