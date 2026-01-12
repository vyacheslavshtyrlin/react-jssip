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
      toggleMute: (...args: Parameters<typeof client.toggleMuteSession>) =>
        client.toggleMuteSession(...args),
      toggleHold: (...args: Parameters<typeof client.toggleHoldSession>) =>
        client.toggleHoldSession(...args),
      sendDTMF: (...args: Parameters<typeof client.sendDTMFSession>) =>
        client.sendDTMFSession(...args),
      transfer: (...args: Parameters<typeof client.transferSession>) =>
        client.transferSession(...args),
      getSession: (...args: Parameters<typeof client.getSession>) =>
        client.getSession(...args),
      getSessionIds: () => client.getSessionIds(),
      getSessions: () => client.getSessions(),
      setSessionMedia: (...args: Parameters<typeof client.setSessionMedia>) =>
        client.setSessionMedia(...args),
      switchCamera: (...args: Parameters<typeof client.switchCameraSession>) =>
        client.switchCameraSession(...args),
      enableVideo: (...args: Parameters<typeof client.enableVideoSession>) =>
        client.enableVideoSession(...args),
      disableVideo: (...args: Parameters<typeof client.disableVideoSession>) =>
        client.disableVideoSession(...args),
    }),
    [client]
  );
}
