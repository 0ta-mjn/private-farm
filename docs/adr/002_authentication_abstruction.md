# ADR‑002 – Authentication Abstraction (Frontend & Backend)

**Date:** 2025‑07‑08   |   **Status:** Accepted

---

## Context

SatoPod の初期実装は Supabase Auth を直接呼び出しており、以下の課題があった。

* ID プロバイダーを替えにくい（ベンダーロック）。
* サーバー側制御（HttpOnly Cookie、セッション失効）が追加しづらい。
* SDK 依存のためテストが冗長。

---

## Decision

1. **バックエンド**: `AuthProvider` インターフェースを導入し DI。初期実装は `SupabaseAuth`、テスト用に `DummyAuth`。
2. **フロントエンド**: `FrontendAuthAdapter` を導入し、Cookie ベースのセッションと必要に応じて Bearer ヘッダーを生成。初期実装は Supabase 版。
3. これによりビジネスロジックと UI は IDP 非依存となり、Keycloak 等への乗り換えが低コストで可能となる。

---

## Consequences

* Supabase をデフォルトとして保ちつつ、他 Provider の実装をコミュニティに委ねられる。
* テストでは `DummyAuth` でユニット、`SupabaseAuth` で E2E を共通スイートで実行。
* 追加コストは最小限（インターフェース + ミドルウェア）で、今後の拡張余地が大きい。
