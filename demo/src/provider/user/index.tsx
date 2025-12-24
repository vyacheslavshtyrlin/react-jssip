import compose from "compose-function";

import withSip from "./withSip";
import withSipEventsProvider from "./withSipEventsProvider";
import witchCurrentUserProvider from "./withUserData";
import { withMicrophoneProvider } from "./withMicrophoneProvider";

export const withUserProviders = compose(
  witchCurrentUserProvider,
  withMicrophoneProvider,
  withSip,
  withSipEventsProvider
);
