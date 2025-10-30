/**
 * Media Store
 *
 * Manages GoToSocial media attachments
 */
import { makeAutoObservable } from "mobx";
import { gtsClient } from "@/lib/gotosocial";
import type { mastodon } from "@/lib/gotosocial";

class LocalState {
  // Media cache (keyed by media ID)
  mediaMapById: Record<string, mastodon.v1.MediaAttachment> = {};

  // Upload progress tracking
  uploadProgress: Record<string, number> = {}; // 0-100

  constructor() {
    makeAutoObservable(this);
  }

  setPartial(partial: Partial<LocalState>) {
    Object.assign(this, partial);
  }
}

const mediaStore = (() => {
  const state = new LocalState();

  /**
   * Upload media file
   */
  const uploadMedia = async (
    file: File,
    params?: {
      description?: string;
      focus?: string;
    },
  ): Promise<mastodon.v1.MediaAttachment> => {
    const client = gtsClient.getClient();

    // Create temp ID for progress tracking
    const tempId = `upload_${Date.now()}`;

    try {
      // Set initial progress
      state.setPartial({
        uploadProgress: {
          ...state.uploadProgress,
          [tempId]: 0,
        },
      });

      // Upload media
      const media = await client.v1.media.create({
        file,
        description: params?.description,
        focus: params?.focus,
      });

      // Update cache
      state.setPartial({
        mediaMapById: {
          ...state.mediaMapById,
          [media.id]: media,
        },
      });

      // Complete progress
      state.setPartial({
        uploadProgress: {
          ...state.uploadProgress,
          [tempId]: 100,
        },
      });

      // Clean up progress after a delay
      setTimeout(() => {
        const progress = { ...state.uploadProgress };
        delete progress[tempId];
        state.setPartial({ uploadProgress: progress });
      }, 2000);

      return media;
    } catch (error) {
      // Clean up progress on error
      const progress = { ...state.uploadProgress };
      delete progress[tempId];
      state.setPartial({ uploadProgress: progress });

      throw error;
    }
  };

  /**
   * Update media metadata
   */
  const updateMedia = async (
    id: string,
    params: {
      description?: string;
      focus?: string;
    },
  ): Promise<mastodon.v1.MediaAttachment> => {
    const client = gtsClient.getClient();
    const media = await client.v1.media.$select(id).update(params);

    // Update cache
    state.setPartial({
      mediaMapById: {
        ...state.mediaMapById,
        [id]: media,
      },
    });

    return media;
  };

  /**
   * Get media by ID
   */
  const getMedia = async (id: string): Promise<mastodon.v1.MediaAttachment> => {
    // Check cache first
    if (state.mediaMapById[id]) {
      return state.mediaMapById[id];
    }

    // Fetch from server
    const client = gtsClient.getClient();
    const media = await client.v1.media.$select(id).fetch();

    // Update cache
    state.setPartial({
      mediaMapById: {
        ...state.mediaMapById,
        [id]: media,
      },
    });

    return media;
  };

  /**
   * Get upload progress for a file
   */
  const getUploadProgress = (tempId: string): number => {
    return state.uploadProgress[tempId] || 0;
  };

  return {
    state,
    uploadMedia,
    updateMedia,
    getMedia,
    getUploadProgress,
  };
})();

export default mediaStore;
