# SIP Debugging cheatsheet

Enable JsSIP debug logging from your app:

```ts
import { createSipClientInstance } from "jssip-lib";

const client = createSipClientInstance({ debug: "JsSIP:*" });
client.connect(uri, password, config); // debug will be applied

// toggle later at runtime
client.setDebug(false);         // disable
client.setDebug("JsSIP:*");     // enable with pattern
```

Use the browser console helper:

```ts
import { sipDebugger } from "jssip-lib";

// attach to window and toggle
// window.sipSupport.enableDebug();
// window.sipSupport.disableDebug();
// window.sipSupport.toggleDebug();

// or call directly
sipDebugger.toggle();    // toggles debug and persists to sessionStorage
sipDebugger.enable();    // enable
sipDebugger.disable();   // disable
```
