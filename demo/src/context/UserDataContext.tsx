import type { IUser, IUserConfig } from "@/@types/api";
import { createContext } from "react";

type UserDataContextType = {
  user: IUser;
  config: IUserConfig;
};

export const UserDataContext = createContext<UserDataContextType | undefined>(
  {} as UserDataContextType
);
