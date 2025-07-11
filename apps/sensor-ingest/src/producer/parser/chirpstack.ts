import { HonoRequest } from "hono";
import { EnQueuedMessage } from "../../interfaces";

export const parseRequest = async (
  req: Request | HonoRequest
): Promise<EnQueuedMessage | null> => {
  const query = new URL(req.url).searchParams;
  const event = query.get("event");
  switch (event) {
    case "join":
    case "status":
    case "up": {
      const data = await req.json();
      return { event, data };
    }
    default:
      return null;
  }
};
