import { randomUUID, createHash } from "crypto";
import { DEFAULT_ID_LENGTH, DEFAULT_ID_RETRIES } from "@repo/config";

// PostgreSQLの一意制約違反エラーコード
const UNIQUE_VIOLATION_ERROR_CODE = "23505";

/**
 * UUIDを生成してデータベースに挿入する関数（リトライ機能付き）
 * UUID衝突が発生した場合、自動的に新しいUUIDで再試行します
 *
 * @param insertFn - 挿入処理を行う関数。UUIDを引数として受け取る
 * @param options - オプション設定
 * @param options.maxRetries - 最大リトライ回数（デフォルト: 3）
 * @param options.idPrefix - IDのプレフィックス（デフォルト: なし）
 * @param options.length - IDの長さ（プレフィックスを除く）。指定した場合はハッシュ化される
 * @returns 挿入処理の結果
 * @throws エラーが発生した場合、またはリトライ回数上限に達した場合
 *
 * @example
 * ```typescript
 * const organization = await createWithUUIDRetry(
 *   (id) => tx.insert(organizationsTable).values({
 *     id,
 *     name: "組織名",
 *     description: "説明"
 *   }).returning(),
 *   { maxRetries: 5, idPrefix: "org_", length: 12 }
 * );
 * ```
 */
export async function withUniqueIdRetry<T>(
  insertFn: (id: string) => Promise<T>,
  options: {
    maxRetries?: number;
    idPrefix?: string;
    length?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = DEFAULT_ID_RETRIES,
    idPrefix = "",
    length = DEFAULT_ID_LENGTH,
  } = options;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const id = generateUniqueId({ idPrefix, length });

    try {
      return await insertFn(id);
    } catch (error) {
      // UUID衝突の場合のみリトライ
      if (
        isPostgresError(error) &&
        error.code === UNIQUE_VIOLATION_ERROR_CODE &&
        attempt < maxRetries - 1
      ) {
        continue; // 次のリトライへ
      }

      // その他のエラーまたはリトライ上限に達した場合は再スロー
      throw error;
    }
  }

  // このコードに到達することはないが、TypeScriptの型チェックのため
  throw new Error(`Failed to create record after ${maxRetries} retries`);
}

/**
 * PostgreSQLエラーかどうかを判定するタイプガード
 */
function isPostgresError(error: unknown): error is { code: string } {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}

/**
 * UUIDを事前生成する関数
 * シンプルなUUID生成が必要な場合に使用
 *
 * @param options - オプション設定
 * @param options.idPrefix - IDのプレフィックス（デフォルト: なし）
 * @param options.length - IDの長さ（プレフィックスを除く）。指定した場合はハッシュ化される
 * @returns 新しいUUID文字列
 *
 * @example
 * ```typescript
 * // 標準UUID
 * const id1 = generateUniqueId(); // "550e8400-e29b-41d4-a716-446655440000"
 *
 * // プレフィックス付き
 * const id2 = generateUniqueId({ idPrefix: "org_" }); // "org_550e8400-e29b-41d4-a716-446655440000"
 *
 * // 固定長（ハッシュ化）
 * const id3 = generateUniqueId({ length: 12 }); // "a1b2c3d4e5f6"
 *
 * // プレフィックス + 固定長
 * const id4 = generateUniqueId({ idPrefix: "user_", length: 8 }); // "user_a1b2c3d4"
 * ```
 */
export function generateUniqueId(
  options: {
    idPrefix?: string;
    length?: number;
  } = {}
): string {
  const { idPrefix = "", length } = options;

  const uuid = randomUUID();

  if (length) {
    // lengthが指定された場合、ハッシュ化して指定長に調整
    const hash = createHash("sha256").update(uuid).digest("hex");
    const truncatedHash = hash.substring(0, length);
    return idPrefix + truncatedHash;
  }

  // lengthが指定されていない場合は通常のUUID
  return idPrefix + uuid;
}
