import type { IUser } from "@/@types/api";
import { useUsersLocalStore } from "@/store/useUsersLocalStore";
import { useConfig } from "./useConfig";
import { useParams } from "react-router-dom";

export const useUsers = () => {
  const { id } = useParams();

  const { registerConfig, updateConfig } = useConfig();

  const users = useUsersLocalStore((s) => s.users);
  const addUser = useUsersLocalStore((s) => s.addUser);

  const updateUserStore = useUsersLocalStore((s) => s.updateUser);

  const registerUser = (data: Omit<IUser, "id">) => {
    const user = { ...data, id: crypto.randomUUID() };
    addUser(user);
    registerConfig(user);
  };

  const updateUser = (updated: Omit<IUser, "id">) => {
    if (!id) return;

    updateUserStore(id, updated);

    const { login, host, port, password, pathname } = updated;

    const uaConfig = {
      uri: `sip:${login}@${host}:${port}`,
      password: password,
      socket: `wss://${host}:${port}${pathname}`,
    };

    updateConfig({
      uaConfig: uaConfig,
    });
  };

  return { users, registerUser, updateUser };
};
