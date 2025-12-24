import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import UserForm from "@/components/user-form";
import { useUsers } from "@/hook/useUsers";

export const CreateUserDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { registerUser } = useUsers();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[650px] max-h-[90vh] ">
        <DialogHeader>
          <DialogTitle>Создать пользователя</DialogTitle>
          <DialogDescription className="text-xs">
            *Сохраняется в храналище браузера
          </DialogDescription>
        </DialogHeader>
        <UserForm
          onSubmit={(user) => {
            registerUser(user);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};
