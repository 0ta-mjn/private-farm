/**
 * デフォルトのUUID設定
 */
export const DEFAULT_UUID_CONFIG = {
  organization: {
    idPrefix: "org_",
  },
  membership: {
    idPrefix: "mbr_",
  },
  user: {
    idPrefix: "usr_",
  },
  thing: {
    idPrefix: "tng_",
  },
  diary: {
    idPrefix: "diy_",
  },
} as const;

export const DEFAULT_ID_LENGTH = 12;
export const DEFAULT_ID_RETRIES = 3;
