"use client";

import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useState, type ReactNode } from "react";

import { PhoneInput } from "@/components/common/phone-input";
import { Input as UIInput } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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
  min?: string;
  max?: string;
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

  if (type === "password") {
    return (
      <PasswordInput
        ref={ref as React.Ref<HTMLInputElement>}
        {...props}
        onChange={onChange}
      />
    );
  }

  if (type === "tel") {
    return <PhoneInput {...props} onChange={onChange} />;
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
      min={props.min}
      max={props.max}
      onBlur={props.onBlur}
      onChange={(event) => onChange?.(event.target.value)}
    />
  );
});

const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, "type">>(
  function PasswordInput({ onChange, ...props }, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <UIInput
          ref={ref}
          id={props.id}
          type={visible ? "text" : "password"}
          value={props.value}
          name={props.name}
          placeholder={props.placeholder}
          disabled={props.disabled}
          className={cn("pr-8", props.className)}
          aria-invalid={props["aria-invalid"]}
          onBlur={props.onBlur}
          onChange={(event) => onChange?.(event.target.value)}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((prev) => !prev)}
          disabled={props.disabled}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    );
  },
);
