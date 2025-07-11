/**
 * コマンドライン引数で受け取ったバイナリ文字列（例: "01 0610 5C5D0000 ... DD0A"）
 * をバイナリに変換し、Base64エンコードして標準出力に出力するスクリプト
 */

if (process.argv.length < 3) {
  console.error('Usage: node bin-str-to-base64.mjs "<binary string>"');
  process.exit(1);
}

const input = process.argv[2];

// 空白区切りで分割し、各要素を16進数バイト列として連結
const hexStr = input.replace(/\s+/g, '').replace("\" \'", '')

// バイト配列に変換
const buffer = Buffer.from(hexStr, 'hex');

// Base64エンコードして出力
console.log(buffer.toString('base64'));