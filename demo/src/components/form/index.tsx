import { Form as ShadcnForm } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type {
  FieldValues,
  SubmitHandler,
  UseFormReturn,
} from "react-hook-form";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";

interface FormWrapperProps<T extends FieldValues> {
  className?: string;
  children: ReactNode;
  form: UseFormReturn<T>;
  onSubmit: SubmitHandler<T>;
}

export const Form = <T extends FieldValues>({
  children,
  className = "",
  form,
  onSubmit,
}: FormWrapperProps<T>) => {
  return (
    <ShadcnForm {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn(className)}>
        <ScrollArea className="flex-1 min-h-0 max-h-full px-4">
          {children}
        </ScrollArea>
        <div className="px-4 py-1">
          <Button className="mt-auto w-fit" type="submit">
            Сохранить
          </Button>
        </div>
      </form>
    </ShadcnForm>
  );
};
