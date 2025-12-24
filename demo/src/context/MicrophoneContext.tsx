import { createContext } from "react";

export interface MicrophoneContextValue {
  microphones: MediaDeviceInfo[];
  permission: "loading" | "granted" | "denied";
  selectedMicId: string | null;
  setSelectedMicId: (id: string) => void;
  refreshDevices: () => Promise<void>;
  requestMicrophoneStream: () => Promise<MediaStream>;
}

export const MicrophoneContext = createContext<
  MicrophoneContextValue | undefined
>(undefined);
