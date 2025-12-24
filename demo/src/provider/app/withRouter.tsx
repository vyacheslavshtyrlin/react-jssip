import { BrowserRouter } from "react-router-dom";


export const withRouter = <P extends object>(Component: React.ComponentType<P>) =>
  (props: P) => (
    <BrowserRouter>
      <Component {...props} />
    </BrowserRouter>
  );
