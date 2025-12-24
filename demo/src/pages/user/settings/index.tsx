import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserForm from "@/components/user-form";
import { useConfig } from "@/hook/useConfig";
import { useUserData } from "@/hook/useUserData";
import { useUsers } from "@/hook/useUsers";
import { MoveLeft, Network, Phone, Settings2, Trash, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PCConfigForm } from "./ui/pc-config-form";

const UserSettingsPage = () => {
  const nav = useNavigate();

  const { user, config } = useUserData();
  const { updateUser } = useUsers();
  const { updateConfig } = useConfig();

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full p-12 ">
      <Card className="flex-1 flex flex-col min-h-0  py-4 ">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="text-2xl flex flex-row gap-3 items-center">
            <Button onClick={() => nav("/users/" + user.id)} variant="neutral">
              <MoveLeft />
            </Button>
            <Settings2 />
            Настройки
          </CardTitle>
          <Button className="bg-red-500 text-white">
            <Trash />
            Удалить
          </Button>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0">
          <Tabs
            className="flex-1 flex flex-col min-h-0"
            orientation="vertical"
            defaultValue="account"
          >
            <TabsList className="justify-start my-3 bg-lattice">
              <TabsTrigger value="account">
                <User />
                Пользователь
              </TabsTrigger>
              <TabsTrigger value="password">
                <Phone /> RTCConfiguration
              </TabsTrigger>

              <TabsTrigger value="UA">
                <Network /> UA
              </TabsTrigger>
            </TabsList>
            <TabsContent
              className="flex-1 flex flex-col min-h-0 p-2"
              value="account"
            >
              <UserForm
                okText="Сохранить"
                values={user}
                onSubmit={(data) => updateUser(data)}
              />
            </TabsContent>
            <TabsContent
              value="password"
              className="flex-1 flex flex-col min-h-0 overflow-hidden"
            >
              <PCConfigForm
                onSubmit={(data) => updateConfig({ pcConfig: data })}
                config={config.pcConfig}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserSettingsPage;
