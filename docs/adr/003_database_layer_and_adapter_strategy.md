# ADR‑002 – Database Layer & Adapter Strategy

**Date:** 2025‑07‑09 | **Status:** Accepted

---

## Context

* OSS 個人開発で **月 \$10–20** しか払えないスタートだが、将来は **デバイス 1 000+ / 10^8 rows/yr** まで伸びる想定。
* インジェスト負荷: 1 デバイス 5 分間隔 → 288 k UPS/日、Pub/Sub → Worker 経由でバースト吸収できる構成が望ましい。
* 運用コストとオペレーション負荷を抑えるため、まずは **Cloudflare スタック (Workers, D1, R2)** のみで実現。
* 将来 ClickHouse / Postgres など高度 TSDB に移行できるよう、アプリ層は **Repository インターフェース** に閉じ込め DB 依存を排除。

## Decision

1. **Repository 契約** を 3 つ定義: `RealtimeDB`, `DashboardDB`, `AnalyticsDB`。
2. **初期アダプター**

   * Cloudflare **D1** → Realtime & Dashboard
   * Cloudflare **R2 (Parquet/Iceberg)** → Analytics
3. **将来拡張**: ClickHouse (Analytics), Postgres/Timescale (Dashboard/Analytics) などを adapter 追加で対応。

## Consequences

* **コストの天井**: Workers Paid \$5 + D1 (5 GB/50 M writes) + R2 (10 GB free) → 1 000 デバイス規模でも月 <\$10。超過時は ClickHouse adapter 有効化で月 +\$19 程度。
* **データライフサイクル**: D1 には最新 60 日を保存し、Cron Worker が時間集約 → Parquet を R2 へ転送。古い Parquet は Iceberg で自動圧縮。
* **移行容易性**: 下位 DB 交換は `repos/adapters/*` の差し替えと ENV 切替のみ。Ingest パイプラインや UI コードに変更は生じない。
* **開発体験**: `memory` / `sqlite` adapter でローカルテスト、CI で全 adapter を同一契約で検証。DB 方言差異は早期に検出できる。
* **リスクコントロール**: Iceberg REST (R2) が不安定な場合は ClickHouse S3 エンジンへ即時スイッチ可能な手順を文書化。
