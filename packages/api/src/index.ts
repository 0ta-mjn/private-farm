import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import {
  createCallerFactory,
  createTRPCContext,
  createTRPCRouter,
} from "./trpc";
import { userRouter } from "./router/user";
import { organizationRouter } from "./router/organization";

export const appRouter = createTRPCRouter({
  user: userRouter,
  organization: organizationRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
/**
 * Create a server-side caller for the tRPC API
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);

/**
 * Inference helpers for input types
 * @example
 * type PostByIdInput = RouterInputs['post']['byId']
 *      ^? { id: number }
 **/
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helpers for output types
 * @example
 * type AllPostsOutput = RouterOutputs['post']['all']
 *      ^? Post[]
 **/
export type RouterOutputs = inferRouterOutputs<AppRouter>;

export { createTRPCContext };
