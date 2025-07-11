import { HonoRequest } from "hono";

export const parseRequest = async (
  req: Request | HonoRequest
): Promise<string | null> => {
  const query = new URL(req.url).searchParams;
  const event = query.get("event");
  switch (event) {
    case "up": {
      const data = await req.json();
      return JSON.stringify({ event, data });
    }
    default:
      return null;
  }
};
