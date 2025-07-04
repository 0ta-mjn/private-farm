"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import { client } from "@/rpc/client";
import { users } from "@/rpc/factory";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface OrganizationContextType {
  currentOrganizationId: string | null;
  setCurrentOrganization: (organizationId: string) => void;
  clearCurrentOrganization: () => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined
);

interface OrganizationProviderProps {
  children: ReactNode;
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const [currentOrganizationId, setCurrentOrganizationIdState] = useState<
    string | null
  >(null);
  const lastInvalidatedOrgRef = useRef<string | null>(null);

  const queryClient = useQueryClient();

  // 組織の最終閲覧時刻を更新するmutation
  const updateOrganizationViewedMutation = useMutation({
    mutationFn: async (data: { organizationId: string }) => {
      return client.user["organization-viewed"].$put({
        json: data,
      });
    },
    onSuccess: (_, variables) => {
      // 前回無効化した組織と異なる場合のみキャッシュを無効化
      if (lastInvalidatedOrgRef.current !== variables.organizationId) {
        lastInvalidatedOrgRef.current = variables.organizationId;
        queryClient.invalidateQueries(users.sidebarData());
      }
    },
    onError: (error: unknown) => {
      console.warn("Failed to update organization viewed:", error);
    },
  });

  const setCurrentOrganization = useCallback(
    (organizationId: string) => {
      // 同じ組織IDの場合は何もしない（重複実行を防ぐ）
      if (currentOrganizationId === organizationId) {
        return;
      }

      setCurrentOrganizationIdState(organizationId);

      // 組織の最終閲覧時刻を更新
      updateOrganizationViewedMutation.mutate({ organizationId });
    },
    [currentOrganizationId, updateOrganizationViewedMutation]
  );

  const clearCurrentOrganization = () => {
    setCurrentOrganizationIdState(null);
  };

  const value: OrganizationContextType = {
    currentOrganizationId,
    setCurrentOrganization,
    clearCurrentOrganization,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error(
      "useOrganization must be used within an OrganizationProvider"
    );
  }
  return context;
}
