# react-jssip-kit

React provider and hooks around [JsSIP](https://jssip.net/) for SIP/WebRTC calls with idiomatic React state.

## Installation

```bash
npm install react-jssip-kit jssip
```

Peer deps: `react >=18 <20` and `react-dom >=18 <20`.

## Quick start

```tsx
import React from "react";
import {
  SipProvider,
  useSipKernel,
  useActiveSipSession,
  useSipState,
  useSipActions,
  createSipKernel,
  WebSocketInterface,
} from "react-jssip-kit";

const kernel = createSipKernel();

function SipBoot() {
  const { commands } = useSipKernel();

  React.useEffect(() => {
    commands.connect("sip:alice@example.com", "supersecret", {
      sockets: [new WebSocketInterface("wss://example.com/ws")],
      uri: "sip:example.com",
      display_name: "Alice",
    });

    return () => commands.disconnect();
  }, [commands]);

  return null;
}

function CallControls() {
  const { sipStatus } = useSipState();
  const activeSession = useActiveSipSession();
  const { call, hangup, toggleMute } = useSipActions();

  return (
    <div>
      <div>Status: {sipStatus}</div>
      <button onClick={() => call("sip:bob@example.com")}>Call Bob</button>
      <button onClick={() => hangup(activeSession?.id)}>Hang up</button>
      <button onClick={() => toggleMute(activeSession?.id)}>Toggle mute</button>
    </div>
  );
}

export function App() {
  return (
    <SipProvider kernel={kernel}>
      <SipBoot />
      <CallControls />
    </SipProvider>
  );
}
```

## Migration

`SipProvider` is kernel-only.

```tsx
// before
<SipProvider client={client} />

// after
const kernel = createSipKernel();
<SipProvider kernel={kernel} />
```

## Selector-first usage

Use selector hooks for minimal re-renders.

```tsx
import { useSipSelector } from "react-jssip-kit";

const sipStatus = useSipSelector((state) => state.sipStatus);
const hasError = useSipSelector((state) => Boolean(state.error));
```

```tsx
import { useSipSession, useActiveSipSession } from "react-jssip-kit";

const active = useActiveSipSession();
const current = useSipSession(active?.id);
```

```tsx
import { useSessionMedia } from "react-jssip-kit";

const { remoteStream, audioTracks } = useSessionMedia(sessionId);
```

## API surface

- `SipProvider` provides `SipKernel` to children.
- Hooks: `useSipKernel`, `useSipState`, `useSipSelector`, `useSipActions`, `useSipEvent`, `useSipSessionEvent`, `useSipSessions`, `useSipSession`, `useActiveSipSession`, `useSessionMedia`.
- Components: `CallPlayer` (basic remote audio element).
- Kernel utilities: `createSipKernel`, `createSipClientInstance`, `createSipEventManager`.
- Kernel commands include:
  - Call/session: `call`, `answer`, `hangup`, `hangupAll`, `toggleMute`, `toggleHold`, `sendDTMF`, `transfer`, `sendInfo`, `update`, `reinvite`.
  - UA-level: `sendMessage`, `sendOptions`.
- JsSIP utility: `WebSocketInterface`.

## Public API Contract (1.0.0)

The package has a single supported entrypoint: `react-jssip-kit`.

Public and supported:
- `SipProvider` and `SipProviderProps`
- Hooks listed above
- `CallPlayer`
- `createSipKernel()`
- `createSipClientInstance()`
- `createSipEventManager()`
- `SipStatus`, `CallStatus`, `CallDirection`
- Public types exported from root (`SipKernel`, `SipState`, event/call option types)
- Public state shape: `SipState = { sipStatus, error, sessions }`

Internal (not part of public contract):
- Direct imports from `src/core/*`
- `SipContext` object
- Internal normalized fields (`sessionsById`, `sessionIds`)
- Any file not re-exported from package root

## Architecture and Lifecycle

Runtime flow (short):
1. App creates kernel with `createSipKernel()`.
2. `SipProvider` injects kernel into React tree.
3. `commands.connect(...)` starts UA and state transitions.
4. Session events are projected into public `SipState.sessions`.
5. Media hooks (`useSessionMedia`) observe peer connection/remote tracks.
6. `commands.disconnect()` stops UA and performs full cleanup.

Detailed module map and full lifecycle:
- `docs/MODULES.md`

## Build

```bash
npm run build
```

Outputs ESM + CJS + typings to `dist/`.

## License

MIT
