import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import type { IUser } from "@/@types/api";
import { SaveIcon } from "lucide-react";
import { Form } from "../form";
import { FormItem } from "../form/form-item";

type User = Omit<IUser, "id">;

const formSchema = z.object({
  login: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  password: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  host: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  port: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  pathname: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
});

export default function UserForm({
  values,
  onSubmit,
}: {
  values?: User;
  onSubmit: (user: User) => void;
}) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values,
    defaultValues: {
      host: "voip.victory-crm.ru",
      port: "8089",
      pathname: "/ws",
    },
  });

  return (
    <Form
      className="h-full flex flex-col gap-2"
      form={form}
      onSubmit={onSubmit}
    >
      <>
        <FormItem
          name="login"
          render={(field) => <Input placeholder="Логин" {...field} />}
        />
        <FormItem
          name="password"
          render={(field) => <Input placeholder="Пароль" {...field} />}
        />
        <div className="grid grid-cols-3 gap-2">
          <FormItem
            name="host"
            render={(field) => (
              <Input placeholder="voip.example.ru" {...field} />
            )}
          />{" "}
          <FormItem
            name="port"
            render={(field) => <Input placeholder="9000" {...field} />}
          />
          <FormItem
            name="pathname"
            render={(field) => <Input placeholder="/ws" {...field} />}
          />
        </div>
      </>
    </Form>
  );
}
