import { client } from "@/rpc/client";
import { createQueryKeys } from "@lukemorales/query-key-factory";

/**
 * User Factory
 */
export const users = createQueryKeys("users", {
  me: () => ({
    queryKey: [undefined],
    queryFn: () => client.user.me.$get(),
  }),
  setupCheck: () => ({
    queryKey: [undefined],
    queryFn: () => client.user["setup"].$get(),
  }),
  sidebarData: () => ({
    queryKey: [undefined],
    queryFn: () => client.user["sidebar-data"].$get(),
  }),
});

/**
 * Organization Factory
 */
export const organizations = createQueryKeys("organizations", {
  list: () => ({
    queryKey: [undefined],
    queryFn: () => client.organization.list.$get(),
  }),
  detail: (organizationId: string) => ({
    queryKey: [organizationId],
    queryFn: () =>
      client.organization.detail[":organizationId"].$get({
        param: { organizationId },
      }),
  }),
});

/**
 * Thing Factory
 */
export const things = createQueryKeys("things", {
  list: (organizationId: string) => ({
    queryKey: [organizationId],
    queryFn: () =>
      client.thing.list[":organizationId"].$get({
        param: { organizationId },
      }),
  }),
  detail: (organizationId: string, thingId: string) => ({
    queryKey: [organizationId, thingId],
    queryFn: () =>
      client.thing.detail[":organizationId"][":thingId"].$get({
        param: { organizationId, thingId },
      }),
  }),
});

/**
 * Diary Factory
 */
export const diaries = createQueryKeys("diaries", {
  detail: (organizationId: string, diaryId: string) => ({
    queryKey: [organizationId, diaryId],
    queryFn: () =>
      client.diary.detail[":organizationId"][":diaryId"].$get({
        param: { organizationId, diaryId },
      }),
  }),
  byDate: (
    organizationId: string,
    input: Parameters<
      (typeof client.diary)["by-date"][":organizationId"]["$get"]
    >[0]["query"]
  ) => ({
    queryKey: [organizationId, input],
    queryFn: () =>
      client.diary["by-date"][":organizationId"].$get({
        param: { organizationId },
        query: input,
      }),
  }),
  byMonth: (
    organizationId: string,
    input: Parameters<
      (typeof client.diary)["by-month"][":organizationId"]["$get"]
    >[0]["query"]
  ) => ({
    queryKey: [organizationId, input],
    queryFn: () =>
      client.diary["by-month"][":organizationId"].$get({
        param: { organizationId },
        query: input,
      }),
  }),
  list: (
    organizationId: string,
    filters: Omit<
      Parameters<
        (typeof client.diary.search)[":organizationId"]["$get"]
      >[0]["query"],
      "offset" | "search"
    > = {}
  ) => ({
    queryKey: [organizationId, { filters }],
    queryFn: ({ pageParam }) =>
      client.diary.search[":organizationId"].$get({
        param: { organizationId },
        query: {
          ...filters,
          offset: typeof pageParam === "number" ? pageParam.toString() : "0",
        },
      }),
    contextQueries: {
      search: (query: string) => ({
        queryKey: [query],
        queryFn: ({ pageParam }) =>
          client.diary.search[":organizationId"].$get({
            param: { organizationId },
            query: {
              ...filters,
              search: query,
              offset:
                typeof pageParam === "number" ? pageParam.toString() : "0",
            },
          }),
      }),
    },
  }),
});

/**
 * Discord Factory
 */
export const discord = createQueryKeys("discord", {
  channels: (organizationId: string) => ({
    queryKey: [organizationId],
    queryFn: () =>
      client.discord.channels[":organizationId"].$get({
        param: { organizationId },
      }),
  }),
});
