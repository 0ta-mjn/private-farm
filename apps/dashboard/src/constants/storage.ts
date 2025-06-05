/**
 * ローカルストレージキーの定数
 */
export const STORAGE_KEYS = {
  CURRENT_ORGANIZATION_ID: "current-organization-id",
  USER_PREFERENCES: "user-preferences",
  THEME: "theme",
} as const;

/**
 * ストレージキーの型
 */
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
