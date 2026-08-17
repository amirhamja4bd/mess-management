import type { NextRequest } from "next/server";
import { apiError } from "@/lib/api-response";
import { requireActiveUser } from "@/lib/auth/session";
import type { CurrentUser } from "@/lib/auth/session";
import { getOrgContext } from "@/lib/authorization";
import type { OrgContext } from "@/lib/authorization";

/**
 * Route handler plumbing. Every route follows:
 *   Handler -> Authentication -> Authorization -> Validation -> Service
 *
 * These wrappers centralize auth + organization resolution + error mapping so
 * individual routes only implement validation and delegation to services.
 */

export interface RouteContext {
  params: Record<string, string>;
  user: CurrentUser;
}

export interface OrgRouteContext extends RouteContext {
  context: OrgContext;
}

type Segment<Params> = { params: Promise<Params> };

type AuthHandler<Params extends Record<string, string>> = (
  request: NextRequest,
  ctx: { params: Params; user: CurrentUser }
) => Promise<Response>;

type OrgHandler<Params extends Record<string, string>> = (
  request: NextRequest,
  ctx: { params: Params; user: CurrentUser; context: OrgContext }
) => Promise<Response>;

/** Resolve the authenticated user from the session. Throws UnauthorizedError. */
export function withAuthHandler<Params extends Record<string, string> = Record<string, string>>(
  handler: AuthHandler<Params>
) {
  return async (request: NextRequest, segment: Segment<Params>) => {
    try {
      const params = await segment.params;
      const user = await requireActiveUser();
      return await handler(request, { params, user });
    } catch (error) {
      return apiError(error);
    }
  };
}

/**
 * Resolve an authenticated user plus their active membership + permission
 * context for `params.organizationId`. Cross-tenant access is rejected by
 * getOrgContext (the user is not a member of other organizations).
 */
export function withOrgHandler<Params extends Record<string, string> = Record<string, string>>(
  handler: OrgHandler<Params>
) {
  return async (request: NextRequest, segment: Segment<Params>) => {
    try {
      const params = await segment.params;
      const user = await requireActiveUser();
      const context = await getOrgContext(user, params.organizationId);
      return await handler(request, { params, user, context });
    } catch (error) {
      return apiError(error);
    }
  };
}

/** Wrap a public (unauthenticated) route with error mapping only. */
export function withPublicHandler(
  handler: (request: NextRequest) => Promise<Response>
) {
  return async (request: NextRequest) => {
    try {
      return await handler(request);
    } catch (error) {
      return apiError(error);
    }
  };
}
