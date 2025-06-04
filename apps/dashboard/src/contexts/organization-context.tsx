"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { STORAGE_KEYS } from "@/constants/storage";

interface OrganizationContextType {
  currentOrganizationId: string | null;
  setCurrentOrganization: (organizationId: string) => void;
  setDefaultOrganization: (organizationId: string) => void;
  clearCurrentOrganization: () => void;
  isInitialized: boolean;
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
  const [isInitialized, setIsInitialized] = useState(false);

  // ローカルストレージから初期値を読み込み
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_ORGANIZATION_ID);
      if (stored) {
        setCurrentOrganizationIdState(stored);
      }
    } catch (error) {
      console.warn("Failed to load organization from localStorage:", error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const setCurrentOrganization = (organizationId: string) => {
    setCurrentOrganizationIdState(organizationId);
    try {
      localStorage.setItem(
        STORAGE_KEYS.CURRENT_ORGANIZATION_ID,
        organizationId
      );
    } catch (error) {
      console.warn("Failed to save organization to localStorage:", error);
    }
  };

  const clearCurrentOrganization = () => {
    setCurrentOrganizationIdState(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_ORGANIZATION_ID);
    } catch (error) {
      console.warn("Failed to remove organization from localStorage:", error);
    }
  };

  const setDefaultOrganization = (organizationId: string) => {
    // 現在の組織が設定されていない場合のみデフォルトを設定
    if (!currentOrganizationId && isInitialized) {
      setCurrentOrganization(organizationId);
    }
  };

  const value: OrganizationContextType = {
    currentOrganizationId,
    setCurrentOrganization,
    setDefaultOrganization,
    clearCurrentOrganization,
    isInitialized,
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
