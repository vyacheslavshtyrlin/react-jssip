# react-jssip-kit

React provider and hooks that wrap [JsSIP](https://jssip.net/) so you can manage SIP/WebRTC calls with idiomatic React state.

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
  useSipState,
  useSipActions,
  createSipClientInstance,
  WebSocketInterface,
} from "react-jssip-kit";

const client = createSipClientInstance();

client.connect("sip:alice@example.com", "supersecret", {
  sockets: [new WebSocketInterface("wss://example.com/ws")],
  uri: "sip:example.com",
  display_name: "Alice",
});

function CallControls() {
  const { sessions, sipStatus } = useSipState();
  const { call, hangup, toggleMute } = useSipActions();
  const active = sessions[0];

  return (
    <div>
      <div>Status: {sipStatus}</div>
      <button onClick={() => call("sip:bob@example.com")}>Call Bob</button>
      <button onClick={() => hangup(active?.id)}>Hang up</button>
      <button onClick={() => toggleMute(active?.id)}>Toggle mute</button>
    </div>
  );
}

export function App() {
  return (
    <SipProvider client={client}>
      <CallControls />
    </SipProvider>
  );
}
```

## API surface

- `SipProvider` — supplies `SipClient` and `SipEventManager` to children.
- Hooks: `useSip`, `useSipState`, `useSipActions`, `useSipEvent`, `useSipSessions`.
- Components: `CallPlayer` (basic audio/video elements).
- Utilities re-exported from bundled `jssip-lib`: `createSipClientInstance`, `createSipEventManager`, `WebSocketInterface`, status enums and types.

## Build

```bash
npm run build
```

Outputs ESM + CJS + typings to `dist/`.

## License

MIT
