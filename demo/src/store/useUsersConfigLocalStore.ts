// src/store/useUsersStore.ts
import type { IUserConfig } from "@/@types/api";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type UsersConfigState = {
  configs: IUserConfig[];
  addConfig: (config: IUserConfig) => void;
  updateConfig: (
    id: IUserConfig["user_id"],
    updated: Partial<IUserConfig>
  ) => void;
};

export const useUserConfigLocalStore = create<UsersConfigState>()(
  persist(
    (set, get) => ({
      configs: [],
      addConfig: (config) => set({ configs: [config, ...get().configs] }),
      updateConfig: (id, updated) =>
        set({
          configs: get().configs.map((c) =>
            c.user_id === id ? { ...c, ...updated } : c
          ),
        }),
    }),
    { name: "users-config" }
  )
);
