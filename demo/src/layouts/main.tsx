import { Outlet } from "react-router-dom";
import { Toaster } from "sonner";

function MainLayout() {
  return (
    <main className="flex flex-col h-screen items-center  relative">
      {
        <>
          <Toaster />
          <Outlet />
        </>
      }
    </main>
  );
}

export default MainLayout;