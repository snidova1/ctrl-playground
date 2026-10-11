import { withExecutionContext } from "../server/context";
import handler from "vinext/server/fetch-handler";
import {
  isSitesAuthPath,
  stripOpenAiAuthenticatedUserHeaders,
} from "./cloudflare-headers.mjs";

export default {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (isSitesAuthPath(url.pathname)) {
      return new Response("Sites authentication endpoints are unavailable on CTRL staging.", {
        status: 404,
        headers: { "Cache-Control": "private, no-store" },
      });
    }

    const cleanRequest = new Request(request, {
      headers: stripOpenAiAuthenticatedUserHeaders(request.headers),
    });
    return withExecutionContext(ctx, () => handler.fetch(cleanRequest, env, ctx));
  },
};
