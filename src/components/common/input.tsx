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
  min?: string;
  max?: string;
};

// Matches the phone regex in registrations.schema.ts — stripped live so a letter can never even
// land in the field, instead of only being caught by zod after the fact.
const PHONE_DISALLOWED_CHARS = /[^\d+\s().-]/g;

// Formats digits as the user types: US-style "(555) 123-4567" for local numbers, or
// "+<country> XXX XXX XXX" grouping once a leading "+" signals an international number.
// Digit counts are capped so the result always fits the 20-char limit in the phone schema.
function formatPhoneNumber(raw: string): string {
  const stripped = raw.replace(PHONE_DISALLOWED_CHARS, "");

  if (stripped.trimStart().startsWith("+")) {
    const digits = stripped.replace(/\D/g, "").slice(0, 15);
    if (!digits) return "+";
    const groups = digits.match(/.{1,3}/g) ?? [];
    return `+${groups.join(" ")}`;
  }

  const digits = stripped.replace(/\D/g, "").slice(0, 10);
  const area = digits.slice(0, 3);
  const mid = digits.slice(3, 6);
  const last = digits.slice(6, 10);

  if (digits.length > 6) return `(${area}) ${mid}-${last}`;
  if (digits.length > 3) return `(${area}) ${mid}`;
  if (digits.length > 0) return `(${area}`;
  return "";
}

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
      min={props.min}
      max={props.max}
      onBlur={props.onBlur}
      onChange={(event) => {
        const raw = event.target.value;
        onChange?.(type === "tel" ? formatPhoneNumber(raw) : raw);
      }}
    />
  );
});
