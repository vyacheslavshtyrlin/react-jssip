import { useMemo } from "react";
import { useSipKernel } from "./useSip";

export function useSipActions() {
  const { commands } = useSipKernel();
  return useMemo(
    () => ({
      connect: commands.connect,
      disconnect: commands.disconnect,
      register: commands.register,
      setDebug: commands.setDebug,
      call: commands.call,
      answer: commands.answer,
      hangup: commands.hangup,
      hangupAll: commands.hangupAll,
      toggleMute: commands.toggleMute,
      toggleHold: commands.toggleHold,
      sendDTMF: commands.sendDTMF,
      transfer: commands.transfer,
      getSession: commands.getSession,
      getSessionIds: commands.getSessionIds,
      getSessions: commands.getSessions,
      setSessionMedia: commands.setSessionMedia,
    }),
    [commands]
  );
}
