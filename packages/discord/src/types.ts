import {
  APIAllowedMentions,
  APIEmbed,
  APIMessageTopLevelComponent,
  RESTAPIAttachment,
  RESTAPIPoll,
} from "discord-api-types/v10";

/**
 * @see {@link https://discord.com/developers/docs/resources/channel#embed-object}
 */
export type EmbedMessage = APIEmbed;

/**
 * @see {@link https://discord.com/developers/docs/resources/webhook#execute-webhook}
 */
export interface WebhookPayload {
  /** メッセージ本文 (最大2000文字) */
  content?: string;
  /** Webhook の送信者名を上書き */
  username?: string;
  /** Webhook のアバター URL を上書き */
  avatar_url?: string;
  /** TTS (Text-to-Speech) メッセージかどうか */
  tts?: boolean;
  /** Embed オブジェクトの配列 (最大10) */
  embeds?: EmbedMessage[];
  /** メンション制御オブジェクト */
  allowed_mentions?: APIAllowedMentions;
  /** メッセージコンポーネント (ボタンやセレクト) の配列 */
  components?: APIMessageTopLevelComponent[];
  /** 既存アップロード済みアタッチメント情報の配列 */
  attachments?: RESTAPIAttachment[];
  /** メッセージフラグのビットフィールド */
  flags?: number;
  /** フォーラムチャンネルで新規スレッドを作成する場合のスレッド名 */
  thread_name?: string;
  /** フォーラムチャンネルで作成したスレッドに適用するタグ ID の配列 */
  applied_tags?: string[];
  /** Poll オブジェクト (1つのメッセージにつき1つ) */
  poll?: RESTAPIPoll;
}
