// src/store/useUsersStore.ts
import type { IUser } from "@/@types/api";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type UsersState = {
  users: IUser[];
  addUser: (user: IUser) => void;
  updateUser: (id: IUser["id"], updated: Partial<IUser>) => void;
};

export const useUsersLocalStore = create<UsersState>()(
  persist(
    (set, get) => ({
      users: [],
      addUser: (user) => set({ users: [user, ...get().users] }),
      updateUser: (id, updated) =>
        set({
          users: get().users.map((u) =>
            u.id === id ? { ...u, ...updated } : u
          ),
        }),
      // Add to beginning
    }),
    { name: "users-list" } // localStorage key
  )
);
