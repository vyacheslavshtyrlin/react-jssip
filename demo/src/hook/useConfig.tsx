import type { IUser, IUserConfig } from "@/@types/api";
import { useUserConfigLocalStore } from "@/store/useUsersConfigLocalStore";
import { useParams } from "react-router-dom";

function sanitizeFalsyToUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) {
    if (obj.length === 0) return undefined as any; // Empty array → undefined
    return obj.map(sanitizeFalsyToUndefined) as any;
  } else if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key,
        value === null ||
        (typeof value === "string" && value.trim() === "") ||
        (Array.isArray(value) && value.length === 0)
          ? undefined
          : sanitizeFalsyToUndefined(value),
      ])
    ) as T;
  }
  return obj;
}

const createConfig = ({
  id,
  login,
  password,
  host,
  port,
  pathname,
}: IUser): IUserConfig => {
  return {
    user_id: id,
    uaConfig: {
      socket: `wss://${host}:${port}${pathname}`,
      uri: `sip:${login}@${host}:${port}`,
      password: password,
    },
    pcConfig: {},
    extraHeaders: [],
  };
};

export const useConfig = () => {
  const { id } = useParams();
  const configs = useUserConfigLocalStore((s) => s.configs);
  const addConfig = useUserConfigLocalStore((s) => s.addConfig);

  const updateConfigStore = useUserConfigLocalStore((s) => s.updateConfig);

  const registerConfig = (data: IUser) => {
    addConfig(createConfig(data));
  };

  const updateConfig = (updated: Partial<IUserConfig>) => {
    if (!id) return;
    const sanitized = sanitizeFalsyToUndefined(updated);
    updateConfigStore(id, sanitized);
  };

  return { configs, registerConfig, updateConfig };
};
