import AppRouter from "./routes";
import { withAppProviders } from "./provider/app";

const App = withAppProviders(() => {
  return <AppRouter />;
});

export default App;
