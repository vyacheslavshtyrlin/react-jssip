import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUsers } from "@/hook/useUsers";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export const UserList = ({
  selectedProfile,
  setSelectedProfile,
}: {
  selectedProfile: string | null;
  setSelectedProfile: (id: string) => void;
}) => {
  const { users } = useUsers();

  if (!users.length)
    return <p className="text-md m-auto text-center">Нет пользователей</p>;

  return (
    <ScrollArea className="h-[380px]">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3 px-5">
        {users.map((profile) => (
          <div
            key={profile.id}
            className={cn(
              "relative flex items-center hover:bg-main/80 hover:border-slate-500 rounded-md space-x-3 border-1 p-4 cursor-pointer transition-all",
              selectedProfile === profile.id &&
                "bg-main border-border shadow-shadow"
            )}
            onClick={() =>
              setSelectedProfile(
                profile.id === selectedProfile ? "" : profile.id
              )
            }
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src="/placeholder.svg" alt={profile.login} />
              <AvatarFallback>
                {profile.login.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile.login}@{profile.host}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                Port: {profile.port} • {profile.pathname}
              </p>
            </div>
            {selectedProfile === profile.id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
