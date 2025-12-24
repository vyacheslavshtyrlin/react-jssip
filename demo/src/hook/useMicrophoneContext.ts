import { MicrophoneContext } from "@/context/MicrophoneContext";
import { useContext } from "react";

export const useMicrophoneContext = () => {
  const ctx = useContext(MicrophoneContext);
  if (!ctx) throw new Error("useMicrophoneContext must be used inside MicrophoneProvider HOC");
  return ctx;
};
