# ADR‑004 – Queues → D1 Ingest Pipeline for ChirpStack Sensors

**Date:** 2025‑07‑10 | **Status:** Accepted

---

## Context

* ChirpStack からのアップリンクを **1 デバイス 5 分間隔**（≈288 msg/日）で受信する。初期は数台だが、将来的には **1 000+ デバイス / 3 億 msg/年** まで拡張を見込む。
* 月額コストは OSS 個人開発フェーズで **US\$5–10** に抑えたい。Cloudflare Free / Workers Paid (US\$5) の範囲で運用を開始する。
* センサーデータの**保持期間は 60 日**とし、それ以降はバッチで長期保存 DB（R2 あるいは ClickHouse など）へ移送する方針。
* バースト時のロス防止と D1 書き込み遅延の影響を隔離するため、**キューイングによるバッファリング**を導入する必要がある。

## Decision

1. **受信エンドポイント**: ChirpStack Application Server の HTTP 統合を **Producer Worker** で受信し、検証後に Cloudflare **Queues** へ `send()`。
2. **バッファリング**: Cloudflare **Queues (Standard)** を 1 本。失敗時は最長 7 日 / 最大 100 回の自動再試行に委ねる。
3. **消費・永続化**: **Consumer Worker** が最大 100 件／バッチでメッセージを取得し、Cloudflare **D1** へ一括 `INSERT`。
4. **保持ポリシー**: `readings` テーブルには最新 60 日分のみ保存。**Cron Worker** (JST 04:00 毎日) が `DELETE` と同時に Parquet へ集約し、Cloudflare **R2** (または外部 TSDB) へ転送。

## Consequences

* **低コスト**: Producer/Consumer/Cron の 3 Worker + Queues + D1 で Free/Paid 5 US\$/月以内。デバイス 300 台程度まで追加費用なし。
* **データライフサイクル**: D1 に 60 日間の強整合データを保持し、R2 に Parquet/Iceberg 形式で長期保存。過去データ分析は S3 互換ストレージ上で実行可能。
* **スケーラビリティ**: キューがバッファとなり突発的なパケット集中でもデータロスしにくい。Consumer 側のバッチサイズ／同時実行数を増やすだけでスループットを線形拡張できる。
* **整合性と再試行**: Queue が少なくとも 1 回配送 (at‑least‑once) なので、Consumer 側は **幂等化**（`UNIQUE(dev_eui, ts)` インデックス等）で重複挿入を防止する必要がある。
* **運用リスク**: D1 のスロークエリや容量制限に達した場合でも、Queues が吸収しダウンタイムを最小化。Cron の削除・エクスポート失敗が続くと D1 容量逼迫リスクがあるため、Grafana Cloudflare Plugin でメトリクス監視 & 通知を設定しておく。
