import { useSipActions } from "react-jssip-kit";
import { useUserData } from "./useUserData";
import { useMicrophoneContext } from "./useMicrophoneContext";
import { toast } from "sonner";

export const useCallAction = () => {
  const { requestMicrophoneStream } = useMicrophoneContext();

  const { config } = useUserData();
  const { call, answer, hangup, toggleMute, toggleHold, sendDTMF } = useSipActions();

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

  const answerCall = async () => {
    try {
      const mediaStream = await requestMicrophoneStream();

      const { pcConfig, extraHeaders } = config;
      answer({
        mediaStream,
        pcConfig,
        extraHeaders,
        mediaConstraints: { audio: true, preferCurrentTab: true },
        rtcOfferConstraints: {
          offerToReceiveAudio: true,
          iceRestart: true,
          offerToReceiveVideo: false,
        },
      });
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
