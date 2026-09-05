"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type ReactNode } from "react";
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
  type DefaultValues,
  type FieldValues,
  type Path,
  type SubmitHandler,
  type UseFormReturn,
} from "react-hook-form";

import { Input, type InputOption, type InputType } from "@/components/common/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

import type { ZodType } from "zod";

type FORMProps<T extends FieldValues> = {
  schema: ZodType<T>;
  defaultValues?: DefaultValues<T>;
  onSubmit: SubmitHandler<T>;
  className?: string;
  children: ReactNode | ((form: UseFormReturn<T>) => ReactNode);
};

export function FORM<T extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  className,
  children,
}: FORMProps<T>) {
  const form = useForm<T>({
    resolver: zodResolver(schema as ZodType<T, T>),
    // Passed as `values` (not `defaultValues`) so the form resyncs whenever the caller's data
    // reloads — e.g. after a save invalidates the query it came from. With plain
    // `defaultValues`, the isDirty comparison stays pinned to whatever the form happened to
    // mount with, so re-selecting that original value later reads as "no change" (submit stays
    // disabled) even though the server currently holds something else. `keepDirtyValues`
    // protects any edit the user is mid-typing from being clobbered by that resync; it requires
    // `dirtyFields` to be subscribed, hence the read below. Every caller supplies a fully
    // populated object here, so the cast to T (narrower than the public DefaultValues<T> prop
    // type) always holds in practice.
    values: defaultValues as T | undefined,
    resetOptions: { keepDirtyValues: true },
  });
  void form.formState.dirtyFields;

  const scrollToFirstInvalidField = () => {
    const firstInvalidName = Object.keys(form.formState.errors)[0];
    if (!firstInvalidName) return;
    const field = document.querySelector<HTMLElement>(`[name="${firstInvalidName}"]`);
    field?.scrollIntoView({ behavior: "smooth", block: "center" });
    field?.focus();
  };

  return (
    <FormProvider {...form}>
      <form
        className={className}
        noValidate
        onSubmit={form.handleSubmit(onSubmit, scrollToFirstInvalidField)}
      >
        {typeof children === "function" ? children(form) : children}
      </form>
    </FormProvider>
  );
}

type FormFeildsProps<T extends FieldValues> = {
  name: Path<T>;
  label?: string;
  type?: InputType;
  options?: InputOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function FormFeilds<T extends FieldValues = FieldValues>({
  name,
  label,
  type,
  options,
  placeholder,
  disabled,
  className,
}: FormFeildsProps<T>) {
  const { control } = useFormContext<T>();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.error ? "true" : undefined}>
          {label && <FieldLabel htmlFor={name}>{label}</FieldLabel>}
          <Input
            id={name}
            type={type}
            options={options}
            placeholder={placeholder}
            disabled={disabled}
            className={className}
            value={(field.value as string | undefined) ?? ""}
            name={field.name}
            onChange={field.onChange}
            onBlur={field.onBlur}
            aria-invalid={!!fieldState.error}
          />
          <FieldError errors={fieldState.error ? [fieldState.error] : []} />
        </Field>
      )}
    />
  );
}
