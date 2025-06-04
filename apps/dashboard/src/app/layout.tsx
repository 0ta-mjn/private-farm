import "./globals.css";
import { Inter } from "next/font/google";
import { Poppins } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { TRPCProvider } from "@/trpc/trpc-provider";

// Google Fonts を next/font からインポート
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter", // CSS変数として登録
  display: "swap", // FOUT を抑制する
});
const poppins = Poppins({
  weight: ["400", "600"], // 見出し用に 400 と 600 を読み込む
  subsets: ["latin"],
  variable: "--font-poppins", // CSS変数として登録
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${inter.variable} ${poppins.variable} antialiased`}>
        <TRPCProvider>
          <AuthProvider>{children}</AuthProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}
