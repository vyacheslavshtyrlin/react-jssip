import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { UserList } from "./ui/user-list";
import { CreateUserDialog } from "./ui/create-user-dialog";
import { useNavigate } from "react-router-dom";

const UsersPage = () => {
  const [open, setOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const nav = useNavigate();

  return (
    <div className="w-full h-full items-center flex flex-col justify-center">
      <CreateUserDialog open={open} onOpenChange={setOpen} />
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Выберите профиль</CardTitle>
          <CardDescription>Выберите профиль или создайте новый</CardDescription>
        </CardHeader>
        <CardContent>
          <UserList
            selectedProfile={selectedProfile}
            setSelectedProfile={setSelectedProfile}
          />

          <Button
            onClick={() => setOpen(true)}
            variant="noShadow"
            className={cn(
              "w-full border-dashed mt-4 bg-neutral-50 flex items-center justify-center space-x-2  p-4 cursor-pointer transition-all",
              selectedProfile === "new" && "border-primary bg-accent"
            )}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Создать пользователя
              </p>
            </div>
            {selectedProfile === "new" && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </Button>
        </CardContent>
        <CardFooter>
          <div className="flex justify-end pt-4">
            <Button
              disabled={!selectedProfile}
              onClick={() => nav("/users/" + selectedProfile)}
            >
              Войти
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default UsersPage;
