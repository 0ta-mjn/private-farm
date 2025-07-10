# Satopod ChirpStack Example

このサンプルではChirpStack Dockerイメージを使用して、SatopodのLoRaWANネットワークを構築します。

## Packages

- [ChirpStack](https://www.chirpstack.io/) - LoRaWANネットワークサーバー
- [LWN-Simulator](https://github.com/UniCT-ARSLab/LWN-Simulator)

## Setup

1. [ChirpStack Docker](https://github.com/chirpstack/chirpstack-docker)を起動

    ```bash
    git clone https://github.com/chirpstack/chirpstack-docker.git
    cd chirpstack-docker
    docker compose up -d
    ```

1. ChirpStackのWeb UIにアクセス
    - URL: `http://localhost:8080`
    - ユーザー名: `admin`
    - パスワード: `admin`

1. ChirpStackで以下の設定を行う
    - **Gateway**
      - Gateways > Add Gateway
      - Gateway ID(EUI64)を生成して入力
      - その他は自由に設定
    - **Device Profiles**
      - Device Profiles > Add Device Profile
      - General: デフォルトでOK
      - Join(OTAA/ABP):  Device supports OTAAを選択
      - その他はデフォルトでOK
    - **Applications**
      - Applications > Add Application
      - 自由に設定
    - **Devices**
      - Applications > [作成したアプリケーション] > Devices > Add Device
      - Device EUI (EUI64)を生成して入力
      - Device Profileを上で作成したものを選択
      - その他はデフォルトでOK
      - Submit後、OTAA keys > Application Keyを生成してメモしておく

1. [LWN-Simulator](https://github.com/UniCT-ARSLab/LWN-Simulator)を起動

    ```bash
    git clone https://github.com/UniCT-ARSLab/LWN-Simulator.git
    cd LWN-Simulator
    make install-dep
    make build
    make run
    ```

1. LWN-SimulatorのWeb UIにアクセス
    - URL: `http://localhost:8000`

1. LWN-Simulatorで以下の設定を行う
    - **Gateway Bridge**
        - Host: `127.0.0.1`
        - Port: `1700`
    - **Gateways**
        - Vertual Gateway
        - Active にチェック
        - MAC Address: ChirpStackで作成したGateway IDを入力
        - その他は自由に設定
    - **Devices**
        - General > Device EUI: ChirpStackで作成したDevice EUIを入力
        - Activation > Otaa supportedにチェック
        - Activation > Application Key: ChirpStackで生成したApplication Keyを入力
        - Frame's settings
          - Uplink
            - FPort: 1
            - Retransmission: 好きな秒数
            - FCnt: 0
          - Downlink
            - FCntDown: 0
        - その他はデフォルトでOK

1. LWN-Simulatorの右上のボタンをクリックして、シミュレーターをスタート

1. 1分ほど待つと、ChirpStackのWeb UIのDevicesでデバイスがアクティブになる。
