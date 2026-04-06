import { useMicDrop, useSessionIceFailed, useSipActions } from "react-jssip-kit";
import { useUserData } from "./useUserData";
import { useMicrophoneContext } from "./useMicrophoneContext";
import { toast } from "sonner";

export const useCallAction = () => {
  const { requestMicrophoneStream } = useMicrophoneContext();

  const { config } = useUserData();
  const { call, answer, hangup, toggleMute, toggleHold, sendDTMF, setSessionMedia, reinvite } =
    useSipActions();

  useMicDrop(async ({ sessionId, trackLive }) => {
    if (trackLive) return; // MicRecoveryManager уже восстановил через replaceTrack
    try {
      const newStream = await requestMicrophoneStream();
      setSessionMedia(sessionId, newStream);
      reinvite(sessionId);
    } catch {
      toast.error("Microphone recovery failed");
    }
  });

  useSessionIceFailed(({ sessionId }) => {
    const ok = reinvite(sessionId, { rtcOfferConstraints: { iceRestart: true } });
    if (!ok) toast.error("Connection lost");
  });

  const startCall = async (target: string) => {
    if (!target) return toast.error("Please enter a valid phone number");

    try {
      const mediaStream = await requestMicrophoneStream();
      const { pcConfig, extraHeaders } = config;
      call(target, {
        pcConfig,
        extraHeaders,
        mediaStream,
        mediaConstraints: { preferCurrentTab: true, audio: true, video: false },
        rtcOfferConstraints: {
          offerToReceiveAudio: true,
          iceRestart: true,
          offerToReceiveVideo: false,
        },
      });
    } catch (error: any) {
      console.log(error);
    }
  };

  const answerCall = async (sessionId: string) => {
    try {
      const mediaStream = await requestMicrophoneStream();

      const { pcConfig, extraHeaders } = config;
      answer(sessionId, { mediaStream, pcConfig, extraHeaders });
    } catch (error) {
      console.error(error);
    }
  };

  return {
    startCall,
    answerCall,
    hangupCall: hangup,
    toggleMuteCall: toggleMute,
    toggleHoldCall: toggleHold,
    sendDTMF,
  };
};
