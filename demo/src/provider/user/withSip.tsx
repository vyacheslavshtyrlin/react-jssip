import { useUserData } from "@/hook/useUserData";
import {
  createSipKernel,
  SipProvider,
  WebSocketInterface,
} from "react-jssip-kit";

import { useEffect } from "react";

const kernel = createSipKernel();

export default function withSip<P extends object>(
  Component: React.ComponentType<P>
) {
  return function WithSipComponent(props: P) {
    const { config } = useUserData();

    const { uaConfig } = config;

    useEffect(() => {
      const { uri, password, socket, ...rest } = uaConfig;

      kernel.commands.connect(uri, password, {
        ...rest,
        sockets: [new WebSocketInterface(socket)],
        register: true,
        enableMicRecovery: true,
        iceCandidateReadyDelayMs: 3000,
      });

      return () => kernel.commands.disconnect();
    }, [uaConfig]);

    return <SipProvider kernel={kernel} children={<Component {...props} />} />;
  };
}
