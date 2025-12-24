import { PCConfigForm } from "./../pages/user/settings/ui/pc-config-form";
import type { ExtraHeaders } from "jssip/lib/RTCSession";
import type { UAConfiguration } from "jssip/lib/UA";

interface IUser {
  id: string;
  login: string;
  password: string;
  host: string;
  port: string;
  pathname: string;
}

export type PCConfigType = Omit<
  RTCConfiguration,
  "certificates" | "iceServers"
> & {
  iceServers: {
    credential?: string;
    urls: string;
    username?: string;
  };
};

interface IUserConfig {
  user_id: string;
  uaConfig: Omit<UAConfiguration, "sockets" | "password"> & {
    socket: string;
    password: string;
  };
  pcConfig: Omit<RTCConfiguration, "certificates">;
  extraHeaders: ExtraHeaders["extraHeaders"];
}
