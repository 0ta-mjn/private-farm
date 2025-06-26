"use client";

import { CheckCircleIcon, PlusIcon, MapIcon, BellIcon } from "lucide-react";
import { Button } from "@/shadcn/button";
import { Card, CardContent } from "@/shadcn/card";
import Link from "next/link";
import { useDiaryDrawerActions } from "@/contexts/diary-drawer-context";

export default function DashboardPage() {
  const diaryDrawerActions = useDiaryDrawerActions();

  return (
    <div className="container mx-auto pb-8 space-y-6">
      <h1 className="sr-only">ダッシュボードホーム</h1>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button
          variant="outline"
          className="flex items-center gap-3 p-4 h-auto justify-start"
          onClick={diaryDrawerActions.openCreate}
        >
          <div className="p-2 bg-primary/10 rounded-lg">
            <PlusIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-card-foreground">日誌登録</h3>
            <p className="text-sm text-muted-foreground">農作業の記録を追加</p>
          </div>
        </Button>

        <Button
          asChild
          variant="outline"
          className="flex items-center gap-3 p-4 h-auto justify-start"
        >
          <Link href="/things">
            <div className="p-2 bg-primary-light/20 rounded-lg">
              <MapIcon className="h-5 w-5 text-primary-light" />
            </div>
            <div className="text-left">
              <h3 className="font-medium text-card-foreground">区画管理</h3>
              <p className="text-sm text-muted-foreground">
                農地区画の設定・管理
              </p>
            </div>
          </Link>
        </Button>

        <Button
          asChild
          variant="outline"
          className="flex items-center gap-3 p-4 h-auto justify-start"
        >
          <Link href="/organization/settings?settings=notifications">
            <div className="p-2 bg-accent/20 rounded-lg">
              <BellIcon className="h-5 w-5 text-accent" />
            </div>
            <div className="text-left">
              <h3 className="font-medium text-card-foreground">通知設定</h3>
              <p className="text-sm text-muted-foreground">
                アラートの設定・管理
              </p>
            </div>
          </Link>
        </Button>
      </div>

      <p className="text-muted-foreground">
        このダッシュボードは、個人農家向けの農作業の管理と農場の運営を支援するために設計されています。
        <br />
        現在はプロトタイプ段階であり、日誌記入機能のみが利用可能です。
      </p>

      <Card className="bg-muted/50 border-none shadow-none">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-medium text-sm">開発中機能</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• センサー・デバイス管理機能</li>
                <li>• センサーリアルタイムダッシュボード</li>
                <li>• 履歴データ表示機能</li>
                <li>• 異常データアラート機能</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
