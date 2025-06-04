import { Button } from "@/shadcn/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="text-2xl font-bold text-center">
        プライベートファームダッシュボード
      </div>
      <div className="text-center text-muted-foreground">
        このダッシュボードは、プライベートファームの管理と運営を支援するために設計されています。
        <br />
        詳細な機能は近日公開予定です。
      </div>

      <div className="flex w-full justify-center items-center gap-3">
        <Link href="/signup">
          <Button className="w-full max-w-xs">今すぐ始める</Button>
        </Link>
        <Link href="/login">
          <Button className="w-full max-w-xs" variant="outline">
            ログイン
          </Button>
        </Link>
      </div>
    </div>
  );
}
