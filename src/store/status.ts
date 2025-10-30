/**
 * Status Store
 *
 * Manages GoToSocial statuses (posts/memos)
 */
import { makeAutoObservable } from "mobx";
import { gtsClient } from "@/lib/gotosocial";
import type { mastodon } from "@/lib/gotosocial";
import { RequestDeduplicator, createRequestKey } from "./store-utils";

class LocalState {
  // Status cache (keyed by status ID)
  statusMapById: Record<string, mastodon.v1.Status> = {};

  // Timeline cache
  homeTimeline: string[] = []; // Array of status IDs
  publicTimeline: string[] = [];
  accountTimeline: string[] = [];

  // Pagination tokens
  homeTimelineNextToken: string | null = null;
  publicTimelineNextToken: string | null = null;
  accountTimelineNextToken: string | null = null;

  // Track which account the account timeline belongs to
  accountTimelineAccountId: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  setPartial(partial: Partial<LocalState>) {
    Object.assign(this, partial);
  }
}

const statusStore = (() => {
  const state = new LocalState();
  const deduplicator = new RequestDeduplicator();

  /**
   * Fetch home timeline
   */
  const fetchHomeTimeline = async (params?: { maxId?: string; limit?: number }): Promise<mastodon.v1.Status[]> => {
    const requestKey = createRequestKey("fetchHomeTimeline", params);

    return deduplicator.execute(requestKey, async () => {
      const client = gtsClient.getClient();
      const statuses = await client.v1.timelines.home.list({
        limit: params?.limit || 20,
        maxId: params?.maxId,
      });

      // Update cache
      const statusMap = { ...state.statusMapById };
      const timelineIds = [...state.homeTimeline];

      for (const status of statuses) {
        statusMap[status.id] = status;
        if (!timelineIds.includes(status.id)) {
          timelineIds.push(status.id);
        }
      }

      // Get next token (last status ID)
      const nextToken = statuses.length > 0 ? statuses[statuses.length - 1].id : null;

      state.setPartial({
        statusMapById: statusMap,
        homeTimeline: timelineIds,
        homeTimelineNextToken: nextToken,
      });

      return statuses;
    });
  };

  /**
   * Fetch public timeline
   */
  const fetchPublicTimeline = async (params?: { maxId?: string; limit?: number; local?: boolean }): Promise<mastodon.v1.Status[]> => {
    const requestKey = createRequestKey("fetchPublicTimeline", params);

    return deduplicator.execute(requestKey, async () => {
      const client = gtsClient.isAuthenticated() ? gtsClient.getClient() : gtsClient.getPublicClient();
      const statuses = await client.v1.timelines.public.list({
        limit: params?.limit || 20,
        maxId: params?.maxId,
        local: params?.local,
      });

      // Update cache
      const statusMap = { ...state.statusMapById };
      const timelineIds = [...state.publicTimeline];

      for (const status of statuses) {
        statusMap[status.id] = status;
        if (!timelineIds.includes(status.id)) {
          timelineIds.push(status.id);
        }
      }

      // Get next token
      const nextToken = statuses.length > 0 ? statuses[statuses.length - 1].id : null;

      state.setPartial({
        statusMapById: statusMap,
        publicTimeline: timelineIds,
        publicTimelineNextToken: nextToken,
      });

      return statuses;
    });
  };

  /**
   * Fetch statuses for a specific account
   */
  const fetchAccountTimeline = async (
    accountId: string,
    params?: {
      maxId?: string;
      limit?: number;
      onlyMedia?: boolean;
      excludeReplies?: boolean;
      excludeBoosts?: boolean;
    },
  ): Promise<mastodon.v1.Status[]> => {
    const requestKey = createRequestKey("fetchAccountTimeline", { accountId, ...params });

    return deduplicator.execute(requestKey, async () => {
      const client = gtsClient.isAuthenticated() ? gtsClient.getClient() : gtsClient.getPublicClient();
      const statuses = await client.v1.accounts.$select(accountId).statuses.list({
        limit: params?.limit || 20,
        maxId: params?.maxId,
        onlyMedia: params?.onlyMedia,
        excludeReplies: params?.excludeReplies,
        excludeReblogs: params?.excludeBoosts,
      });

      const statusMap = { ...state.statusMapById };
      const sameAccount = state.accountTimelineAccountId === accountId;
      const timelineIds = params?.maxId && sameAccount ? [...state.accountTimeline] : [];

      if (!params?.maxId || !sameAccount) {
        timelineIds.length = 0;
      }

      for (const status of statuses) {
        statusMap[status.id] = status;
        if (!timelineIds.includes(status.id)) {
          timelineIds.push(status.id);
        }
      }

      const nextToken = statuses.length > 0 ? statuses[statuses.length - 1].id : null;

      state.setPartial({
        statusMapById: statusMap,
        accountTimeline: timelineIds,
        accountTimelineNextToken: nextToken,
        accountTimelineAccountId: accountId,
      });

      return statuses;
    });
  };

  /**
   * Fetch a single status
   */
  const fetchStatus = async (id: string): Promise<mastodon.v1.Status> => {
    const requestKey = createRequestKey("fetchStatus", { id });

    return deduplicator.execute(requestKey, async () => {
      const client = gtsClient.getClient();
      const status = await client.v1.statuses.$select(id).fetch();

      // Update cache
      state.setPartial({
        statusMapById: {
          ...state.statusMapById,
          [id]: status,
        },
      });

      return status;
    });
  };

  /**
   * Get or fetch status
   */
  const getOrFetchStatus = async (id: string): Promise<mastodon.v1.Status> => {
    if (state.statusMapById[id]) {
      return state.statusMapById[id];
    }
    return await fetchStatus(id);
  };

  /**
   * Fetch status context (replies, ancestors)
   */
  const fetchStatusContext = async (id: string): Promise<mastodon.v1.Context> => {
    const requestKey = createRequestKey("fetchStatusContext", { id });

    return deduplicator.execute(requestKey, async () => {
      const client = gtsClient.getClient();
      const context = await client.v1.statuses.$select(id).context.fetch();

      // Update cache with all statuses in context
      const statusMap = { ...state.statusMapById };
      for (const status of [...context.ancestors, ...context.descendants]) {
        statusMap[status.id] = status;
      }

      state.setPartial({ statusMapById: statusMap });

      return context;
    });
  };

  /**
   * Create a new status
   */
  const createStatus = async (params: mastodon.rest.v1.CreateStatusParams): Promise<mastodon.v1.Status> => {
    const client = gtsClient.getClient();
    const status = await client.v1.statuses.create(params);

    const nextState: Partial<LocalState> = {
      statusMapById: {
        ...state.statusMapById,
        [status.id]: status,
      },
      homeTimeline: [status.id, ...state.homeTimeline],
    };

    if (state.accountTimelineAccountId && status.account && status.account.id === state.accountTimelineAccountId) {
      nextState.accountTimeline = [status.id, ...state.accountTimeline];
    }

    state.setPartial(nextState);

    return status;
  };

  /**
   * Update a status
   */
  const updateStatus = async (id: string, params: mastodon.rest.v1.UpdateStatusParams): Promise<mastodon.v1.Status> => {
    const client = gtsClient.getClient();
    const status = await client.v1.statuses.$select(id).update(params);

    // Update cache
    state.setPartial({
      statusMapById: {
        ...state.statusMapById,
        [id]: status,
      },
    });

    return status;
  };

  /**
   * Delete a status
   */
  const deleteStatus = async (id: string): Promise<void> => {
    const client = gtsClient.getClient();
    await client.v1.statuses.$select(id).remove();

    // Remove from cache and timelines
    const statusMap = { ...state.statusMapById };
    delete statusMap[id];

    state.setPartial({
      statusMapById: statusMap,
      homeTimeline: state.homeTimeline.filter((statusId) => statusId !== id),
      publicTimeline: state.publicTimeline.filter((statusId) => statusId !== id),
    });
  };

  /**
   * Favourite a status
   */
  const favouriteStatus = async (id: string): Promise<mastodon.v1.Status> => {
    const client = gtsClient.getClient();
    const status = await client.v1.statuses.$select(id).favourite();

    // Update cache
    state.setPartial({
      statusMapById: {
        ...state.statusMapById,
        [id]: status,
      },
    });

    return status;
  };

  /**
   * Unfavourite a status
   */
  const unfavouriteStatus = async (id: string): Promise<mastodon.v1.Status> => {
    const client = gtsClient.getClient();
    const status = await client.v1.statuses.$select(id).unfavourite();

    // Update cache
    state.setPartial({
      statusMapById: {
        ...state.statusMapById,
        [id]: status,
      },
    });

    return status;
  };

  /**
   * Boost (reblog) a status
   */
  const boostStatus = async (id: string): Promise<mastodon.v1.Status> => {
    const client = gtsClient.getClient();
    const status = await client.v1.statuses.$select(id).reblog();

    // Update cache
    state.setPartial({
      statusMapById: {
        ...state.statusMapById,
        [id]: status,
      },
    });

    return status;
  };

  /**
   * Unboost (unreblog) a status
   */
  const unboostStatus = async (id: string): Promise<mastodon.v1.Status> => {
    const client = gtsClient.getClient();
    const status = await client.v1.statuses.$select(id).unreblog();

    // Update cache
    state.setPartial({
      statusMapById: {
        ...state.statusMapById,
        [id]: status,
      },
    });

    return status;
  };

  /**
   * Bookmark a status
   */
  const bookmarkStatus = async (id: string): Promise<mastodon.v1.Status> => {
    const client = gtsClient.getClient();
    const status = await client.v1.statuses.$select(id).bookmark();

    // Update cache
    state.setPartial({
      statusMapById: {
        ...state.statusMapById,
        [id]: status,
      },
    });

    return status;
  };

  /**
   * Unbookmark a status
   */
  const unbookmarkStatus = async (id: string): Promise<mastodon.v1.Status> => {
    const client = gtsClient.getClient();
    const status = await client.v1.statuses.$select(id).unbookmark();

    // Update cache
    state.setPartial({
      statusMapById: {
        ...state.statusMapById,
        [id]: status,
      },
    });

    return status;
  };

  /**
   * Fetch bookmarked statuses
   */
  const fetchBookmarks = async (params?: { maxId?: string; limit?: number }): Promise<mastodon.v1.Status[]> => {
    const requestKey = createRequestKey("fetchBookmarks", params);

    return deduplicator.execute(requestKey, async () => {
      const client = gtsClient.getClient();
      const statuses = await client.v1.bookmarks.list({
        limit: params?.limit || 20,
        maxId: params?.maxId,
      });

      // Update cache
      const statusMap = { ...state.statusMapById };
      for (const status of statuses) {
        statusMap[status.id] = status;
      }

      state.setPartial({ statusMapById: statusMap });

      return statuses;
    });
  };

  /**
   * Search statuses
   */
  const searchStatuses = async (
    query: string,
    params?: {
      maxId?: string;
      limit?: number;
      accountId?: string;
    },
  ): Promise<mastodon.v1.Status[]> => {
    const requestKey = createRequestKey("searchStatuses", { query, ...params });

    return deduplicator.execute(requestKey, async () => {
      const client = gtsClient.getClient();
      const results = await client.v2.search.list({
        q: query,
        type: "statuses",
        limit: params?.limit || 20,
        maxId: params?.maxId,
        accountId: params?.accountId,
      });

      // Update cache
      const statusMap = { ...state.statusMapById };
      for (const status of results.statuses) {
        statusMap[status.id] = status;
      }

      state.setPartial({ statusMapById: statusMap });

      return results.statuses;
    });
  };

  /**
   * Clear home timeline cache
   */
  const clearHomeTimeline = () => {
    state.setPartial({
      homeTimeline: [],
      homeTimelineNextToken: null,
    });
  };

  /**
   * Clear account timeline cache
   */
  const clearAccountTimeline = () => {
    state.setPartial({
      accountTimeline: [],
      accountTimelineNextToken: null,
      accountTimelineAccountId: null,
    });
  };

  /**
   * Clear public timeline cache
   */
  const clearPublicTimeline = () => {
    state.setPartial({
      publicTimeline: [],
      publicTimelineNextToken: null,
    });
  };

  /**
   * Clear all timeline caches
   */
  const clearTimelines = () => {
    clearHomeTimeline();
    clearAccountTimeline();
    clearPublicTimeline();
  };

  return {
    state,
    fetchHomeTimeline,
    fetchPublicTimeline,
    fetchAccountTimeline,
    fetchStatus,
    getOrFetchStatus,
    fetchStatusContext,
    createStatus,
    updateStatus,
    deleteStatus,
    favouriteStatus,
    unfavouriteStatus,
    boostStatus,
    unboostStatus,
    bookmarkStatus,
    unbookmarkStatus,
    fetchBookmarks,
    searchStatuses,
    clearHomeTimeline,
    clearAccountTimeline,
    clearPublicTimeline,
    clearTimelines,
  };
})();

export default statusStore;
