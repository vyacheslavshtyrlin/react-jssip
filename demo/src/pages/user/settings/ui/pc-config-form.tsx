import type { IUserConfig } from "@/@types/api";
import { Form } from "@/components/form";
import { FormItem } from "@/components/form/form-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Trash2Icon } from "lucide-react";
import { useFieldArray, useForm, type UseFormReturn } from "react-hook-form";
import { z } from "zod";

const RTCIceServerSchema = z.object({
  credential: z.string().optional(),
  urls: z.union([z.string(), z.array(z.string())]),
  username: z.string().optional(),
});

const formSchema = z.object({
  bundlePolicy: z.enum(["balanced", "max-compat", "max-bundle", ""]).optional(),
  iceCandidatePoolSize: z.number({ message: "Введите число" }).optional(),
  iceTransportPolicy: z.enum(["all", "relay", ""]).optional(),
  iceServers: z.array(RTCIceServerSchema).optional(),
  rtcpMuxPolicy: z.enum(["require", ""]).optional(),
});

type Config = IUserConfig["pcConfig"];

export const PCConfigForm = ({
  config,
  onSubmit,
}: {
  config: Config;
  onSubmit: (config: Config) => void;
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: config,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "iceServers",
  });

  return (
    <Form
      className="flex-1 flex flex-col min-h-0"
      form={form as UseFormReturn<Config>}
      onSubmit={onSubmit}
    >
      <FormItem
        name="iceCandidatePoolSize"
        label="iceCandidatePoolSize"
        render={({ onChange, ...rest }) => (
          <Input
            type="number"
            onChange={(e) => {
              const value = e.target.valueAsNumber;
              onChange(Number.isNaN(value) ? null : value);
            }}
            {...rest}
          />
        )}
      />

      <FormItem
        name="bundlePolicy"
        label="bundlePolicy"
        render={(field) => (
          <Select
            {...field}
            options={[
              { label: "balanced", value: "balanced" },
              { label: "max-compat", value: "max-compat" },
              { label: "max-bundle", value: "max-bundle" },
              { label: "Не задано", value: null },
            ]}
          />
        )}
      />
      <FormItem
        name="rtcpMuxPolicy"
        label="rtcpMuxPolicy"
        render={(field) => (
          <Select
            {...field}
            options={[
              { label: "require", value: "require" },
              { label: "Не задано", value: null },
            ]}
          />
        )}
      />

      <FormItem
        name="iceTransportPolicy"
        label="iceTransportPolicy"
        render={(field) => (
          <Select
            {...field}
            options={[
              { label: "all", value: "all" },
              { label: "relay", value: "relay" },
              { label: "Не задано", value: null },
            ]}
          />
        )}
      />

      <FormItem
        name="iceServers"
        label="ICE Servers"
        render={() => (
          <div className="flex flex-col px-2 py-2 my-2">
            {fields.map((item, index) => (
              <div
                key={item.id}
                className="grid grid-cols-4 gap-4 items-center"
              >
                <FormItem
                  name={`iceServers.${index}.urls`}
                  label={`Server #${index + 1} URL`}
                  render={({ value, onChange }) => (
                    <Input
                      value={value ?? ""}
                      onChange={(e) => onChange(e.target.value)}
                      placeholder="urls"
                    />
                  )}
                />
                <FormItem
                  name={`iceServers.${index}.username`}
                  label="Username"
                  render={({ value, onChange }) => (
                    <Input
                      value={value ?? ""}
                      onChange={(e) => onChange(e.target.value)}
                      placeholder="username (for TURN)"
                    />
                  )}
                />
                <FormItem
                  name={`iceServers.${index}.credential`}
                  label="Credential"
                  render={({ value, onChange }) => (
                    <Input
                      value={value ?? ""}
                      onChange={(e) => onChange(e.target.value)}
                      placeholder="credential (for TURN)"
                    />
                  )}
                />
                <Button
                  className="bg-red-500 w-fit"
                  type="button"
                  onClick={() => remove(index)}
                >
                  <Trash2Icon />
                </Button>
              </div>
            ))}
            <Button
              className="w-fit"
              type="button"
              variant="neutral"
              onClick={() => append({ urls: "" })}
            >
              <PlusCircle />
              Add ICE Server
            </Button>
          </div>
        )}
      />
    </Form>
  );
};
