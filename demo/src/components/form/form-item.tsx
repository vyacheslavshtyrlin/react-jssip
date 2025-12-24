import {
  useFormContext,
  type ControllerRenderProps,
  type FieldValues,
  type UseControllerProps,
} from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
  FormItem as ShadcnFormItem,
} from "../ui/form";

interface FormItemProps {
  name: string;
  label?: string;
  rules?: UseControllerProps["rules"];
  description?: string;
  hidden?: boolean;
  render: (
    field: ControllerRenderProps<FieldValues, string>
  ) => React.ReactNode; // Render prop for custom input
}

export const FormItem: React.FC<FormItemProps> = ({
  name,
  label,
  hidden = false,
  description,
  render,
  rules,
}) => {
  const { control } = useFormContext();

  return (
    <FormField
      rules={rules}
      control={control}
      name={name}
      render={({ field }) => (
        <ShadcnFormItem className="mb-4" hidden={hidden}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>{render(field)}</FormControl>
          <FormMessage />
          {description && <FormDescription>{description}</FormDescription>}
        </ShadcnFormItem>
      )}
    />
  );
};
