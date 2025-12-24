import { UserDataContext } from "@/context/UserDataContext";
import { useContext } from "react";

export const useUserData = () => {
  const ctx = useContext(UserDataContext);
  if (!ctx) throw new Error("Must be inside <CurrentUserProvider>");
  return ctx;
};
