# IoTシステム基本設計

## 基本要件

このシステムは、小規模多品種栽培の農場向けのIoTシステムであり、農業の効率化と生産性向上を目指します。以下に、システムの要件を定義します。

### 農場監視指標

1. **土壌環境**:
   - 体積含水率
   - 土壌温度
   - 土壌EC (電気伝導度)
2. **気象環境**:
   - 気温
   - 湿度
   - 降水量
   - 風速
   - 日射量

### ダッシュボード機能

- **リアルタイムデータ表示**:
  - 土壌環境と気象環境のリアルタイムデータをグラフで表示
- **履歴データ表示**:
  - 過去のデータを選択して表示
  - 日別、週別、月別の履歴グラフ
  - キャリブレーション履歴
- **通知設定機能**:
  - 異常値の検知や欠損・通信断した際に通知
  - 通知方法: Discord
- **農作業日誌機能**:
  - 農作業の記録を入力
  - 日誌の検索・フィルタリング機能
- **デバイス管理機能**:
  - センサーやデバイスの状態を確認
  - デバイスの追加・削除・設定変更

## システムアーキテクチャ

```mermaid
graph TD
  Nd[センサーノード] -->|データ送信| GW[ゲートウェイ]
  GW --> NW[ネットワークサーバー]
  NW -->|転送| PS[Cloud Pub/Sub]
  PS -->|フォーマット| CF[Cloud Functions]
  CF -->|Storage Write API| BQ[Big Query]
  BQ -->|データ取得| DA[ダッシュボードAPI]
  DA -->|データ表示| DF[ダッシュボード]
  DA -->|通知| Discord[Discord Bot]
  DA -->|Auth/DB| Supabase
  DA -->|デバイス登録| NW
```

## データモデル

```mermaid
erDiagram
  Thing {
    string thing_id PK "観測対象ID"
    string name "観測対象名"
    string type "観測対象タイプ"
    string tag "タグ"
  }
  Sensor {
    string sensor_id PK "センサーID"
    string thing_id FK "観測対象ID"
    string name "センサー名"
    string type "センサータイプ"
  }
  ObservedProperty {
    string property_id PK "観測プロパティID"
    string type "プロパティタイプ"
    string name "プロパティ名"
    string unit "単位"
  }
  Datastream {
    string stream_id PK "データストリームID"
    string thing_id FK "観測対象ID"
    string property_id FK "観測プロパティID"
    string sensor_id FK "センサーID"
    string name "データストリーム名"
    int sampling_rate "サンプリングレート"
  }
  Observation {
    string id PK "観測ID"
    string datastream_id FK "データストリームID"
    string value "観測値"
    datetime timestamp "観測日時"
  }
  Organization {
    string id PK "組織ID"
    string name "組織名"
  }
  Diary {
    string id PK "日誌ID"
    string date "日付"
    string content "内容"
  }
  User {
    string id PK "ユーザーID"
    string name "ユーザー名"
  }
  Diary ||--o{ User : "日誌作成者"
  Organization ||--|{ User : "組織メンバー"
  Organization ||--o{ Diary : "組織日誌"
  Diary }o--o{ Thing : "日誌対象ほ場"
  Organization ||--o{ Thing : "センサー群の管理団体"
  Thing ||--o{ Sensor : "観測対象"
  Datastream ||--o{ Observation : "観測結果"
  Datastream }|--|| ObservedProperty : "観測プロパティ"
  Sensor ||--o{ Datastream : "観測ストリーム"
```
