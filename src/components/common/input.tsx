"use client";

import { forwardRef, type ReactNode } from "react";

import { Input as UIInput } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type InputOption = { label: string; value: string };

export type InputType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "tel"
  | "date"
  | "textarea"
  | "select";

type InputProps = {
  id?: string;
  type?: InputType;
  options?: InputOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  value?: string;
  name?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  "aria-invalid"?: boolean;
};

export const Input = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  InputProps
>(function Input({ type = "text", options, onChange, ...props }, ref) {
  const renderers: Record<"textarea" | "select", () => ReactNode> = {
    textarea: () => (
      <Textarea
        ref={ref as React.Ref<HTMLTextAreaElement>}
        id={props.id}
        value={props.value}
        name={props.name}
        placeholder={props.placeholder}
        disabled={props.disabled}
        className={props.className}
        aria-invalid={props["aria-invalid"]}
        onBlur={props.onBlur}
        onChange={(event) => onChange?.(event.target.value)}
      />
    ),
    select: () => (
      <Select
        value={props.value}
        name={props.name}
        disabled={props.disabled}
        onValueChange={(value) => onChange?.(value)}
      >
        <SelectTrigger
          id={props.id}
          className={props.className}
          aria-invalid={props["aria-invalid"]}
          onBlur={props.onBlur}
        >
          <SelectValue placeholder={props.placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options?.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ),
  };

  if (type === "textarea" || type === "select") {
    return renderers[type]();
  }

  return (
    <UIInput
      ref={ref as React.Ref<HTMLInputElement>}
      id={props.id}
      type={type}
      value={props.value}
      name={props.name}
      placeholder={props.placeholder}
      disabled={props.disabled}
      className={props.className}
      aria-invalid={props["aria-invalid"]}
      onBlur={props.onBlur}
      onChange={(event) => onChange?.(event.target.value)}
    />
  );
});
