"use client";

import RPNInput, { type Country } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import "react-phone-number-input/style.css";

import { cn } from "@/lib/utils";

// Studio is US-based, but most enrollees search the country list themselves (many parents
// register with Indian WhatsApp numbers) — this only seeds the flag shown before they pick.
const DEFAULT_COUNTRY: Country = "US";

type PhoneInputProps = {
  id?: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  "aria-invalid"?: boolean;
};

// Wraps react-phone-number-input so every phone field in the app stores/validates a single
// unambiguous E.164 string (e.g. "+919876543210") instead of a bare local-format number whose
// country can only ever be guessed.
export function PhoneInput({ value, onChange, className, ...props }: PhoneInputProps) {
  return (
    <RPNInput
      international
      defaultCountry={DEFAULT_COUNTRY}
      // Records saved before this input existed have no "+" country prefix — read as a national
      // number in defaultCountry so those (mostly US) values still render/save correctly instead
      // of showing as an unparsed, un-flagged number the admin has to fix by hand.
      initialValueFormat="national"
      flags={flags}
      value={value || undefined}
      onChange={(next) => onChange?.(next ?? "")}
      className={cn(
        "flex h-8 w-full min-w-0 items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-base transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:bg-input/50 has-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:has-disabled:bg-input/80",
        className,
      )}
      numberInputProps={{
        id: props.id,
        name: props.name,
        placeholder: props.placeholder,
        disabled: props.disabled,
        onBlur: props.onBlur,
        "aria-invalid": props["aria-invalid"],
        className:
          "min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed",
      }}
      countrySelectProps={{
        disabled: props.disabled,
        "aria-label": "Country calling code",
        className: "bg-transparent text-sm outline-none disabled:cursor-not-allowed",
      }}
    />
  );
}
