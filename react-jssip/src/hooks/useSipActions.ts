import { useMemo } from "react";
import { useSip } from "./useSip";

export function useSipActions() {
  const { client } = useSip();
  return useMemo(
    () => ({
      call: (...args: Parameters<typeof client.call>) => client.call(...args),
      answer: (...args: Parameters<typeof client.answerSession>) =>
        client.answerSession(...args),
      hangup: (...args: Parameters<typeof client.hangupSession>) =>
        client.hangupSession(...args),
      mute: (...args: Parameters<typeof client.muteSession>) =>
        client.muteSession(...args),
      unmute: (...args: Parameters<typeof client.unmuteSession>) =>
        client.unmuteSession(...args),
      hold: (...args: Parameters<typeof client.holdSession>) =>
        client.holdSession(...args),
      unhold: (...args: Parameters<typeof client.unholdSession>) =>
        client.unholdSession(...args),
      sendDTMF: (...args: Parameters<typeof client.sendDTMFSession>) =>
        client.sendDTMFSession(...args),
      transfer: (...args: Parameters<typeof client.transferSession>) =>
        client.transferSession(...args),
      attendedTransfer: (
        ...args: Parameters<typeof client.attendedTransferSession>
      ) => client.attendedTransferSession(...args),
      getSession: (...args: Parameters<typeof client.getSession>) =>
        client.getSession(...args),
      getSessionIds: () => client.getSessionIds(),
      getSessions: () => client.getSessions(),
      setSessionMedia: (...args: Parameters<typeof client.setSessionMedia>) =>
        client.setSessionMedia(...args),
      switchCamera: (
        ...args: Parameters<typeof client.switchCameraSession>
      ) => client.switchCameraSession(...args),
      startScreenShare: (
        ...args: Parameters<typeof client.startScreenShareSession>
      ) => client.startScreenShareSession(...args),
      enableVideo: (...args: Parameters<typeof client.enableVideoSession>) =>
        client.enableVideoSession(...args),
      disableVideo: (...args: Parameters<typeof client.disableVideoSession>) =>
        client.disableVideoSession(...args),
    }),
    [client]
  );
}
