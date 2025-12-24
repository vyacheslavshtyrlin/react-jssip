import { Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowBigLeft, Settings } from "lucide-react";
import { useMicrophoneContext } from "@/hook/useMicrophoneContext";

const UserLayout = () => {
  const nav = useNavigate();

  const { microphones } = useMicrophoneContext();

  console.log("microphones", microphones);

  return (
    <>
      <header className="flex flex-row justify-between   shadow-shadow border p-2 w-full border-b-2 border-border bg-background">
        <Button onClick={() => nav("/users")} variant="neutral" title="Выйти">
          <ArrowBigLeft /> Выйти
        </Button>
        <Button onClick={() => nav("settings")} variant="neutral">
          <Settings /> Настройки
        </Button>
      </header>
      <Outlet />
    </>
  );
};

export default UserLayout;
