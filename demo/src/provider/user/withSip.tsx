import { useUserData } from "@/hook/useUserData";
import {
  createSipClientInstance,
  SipProvider,
  WebSocketInterface,
} from "react-jssip";

import { useEffect } from "react";

const sipClient = createSipClientInstance();

export default function withSip<P extends object>(
  Component: React.ComponentType<P>
) {
  return function WithSipComponent(props: P) {
    const { config } = useUserData();

    const { uaConfig } = config;

    useEffect(() => {
      const { uri, password, socket, ...rest } = uaConfig;

      sipClient.connect(uri, password, {
        ...rest,
        sockets: [new WebSocketInterface(socket)],
        register: true,
        debug: true,
      });

      return () => sipClient.disconnect();
    }, [uaConfig]);

    return (
      <SipProvider
        client={sipClient}
        children={<Component {...props} />}
      />
    );
  };
}
