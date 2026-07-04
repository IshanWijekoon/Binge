import { ApiRouter } from "./infrastructure/http/router";
import { errorResponse, withCors } from "./shared/http";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const router = new ApiRouter(env);
      const response = await router.handle(request, ctx);
      return withCors(response, request, env);
    } catch (error) {
      return withCors(errorResponse(error), request, env);
    }
  },
} satisfies ExportedHandler<Env>;
