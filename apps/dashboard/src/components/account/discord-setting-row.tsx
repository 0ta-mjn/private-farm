"use client";

import { Button } from "@/shadcn/button";
import { LinkIcon, UnlinkIcon } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import DiscordSymbol from "@/assets/discord-symbol.svg";
import { AuthUserIdentity } from "@repo/auth-client";
import { auth } from "@/lib/auth-provider";

interface DiscordSettingRowProps {
  onSuccess?: () => void | Promise<unknown>;
  identity?: AuthUserIdentity | null;
  disabled?: boolean;
}

export function DiscordSettingRow({
  onSuccess,
  identity,
  disabled,
}: DiscordSettingRowProps) {
  const linkMutation = useMutation({
    mutationFn: async () => {
      await auth.linkOAuthProvider("discord", {
        redirectUrl: window.location.href,
      });
    },
    onError: (error) => {
      console.error("Discord link error:", error);
    },
    onSuccess: async () => {
      await onSuccess?.();
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async () => {
      await auth.unlinkOAuthProvider("discord");
    },
    onError: (error) => {
      console.error("Discord unlink error:", error);
    },
    onSuccess: async () => {
      await onSuccess?.();
    },
  });

  const handleDiscordLink = () => {
    linkMutation.mutate();
  };

  const handleDiscordUnlink = () => {
    if (identity) {
      unlinkMutation.mutate();
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="size-6 bg-discord-bg rounded-sm flex items-center justify-center">
            <DiscordSymbol className="size-4" />
          </div>
          <span className="font-medium">Discord</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {identity
            ? `連携済み: ${identity.name}`
            : "連携することで、Discordアカウントでログインできます。"}
        </p>
      </div>

      <div className="flex gap-2">
        {identity ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDiscordUnlink}
            disabled={disabled || unlinkMutation.isPending}
          >
            <UnlinkIcon className="h-4 w-4 mr-2" />
            {unlinkMutation.isPending ? "解除中..." : "連携解除"}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDiscordLink}
            disabled={linkMutation.isPending}
          >
            <LinkIcon className="h-4 w-4 mr-2" />
            {linkMutation.isPending ? "連携中..." : "連携する"}
          </Button>
        )}
      </div>
    </div>
  );
}
