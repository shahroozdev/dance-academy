"use client";

import { Check, ChevronsUpDown, LoaderCircle, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/common/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/common/popover";
import { Input as UIInput } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type SearchSelectOption = { label: string; value: string };

type SearchSelectProps = {
  id?: string;
  name?: string;
  value?: string;
  options?: SearchSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  isLoading?: boolean;
  hasMore?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onSearchChange?: (value: string) => void;
  onLoadMore?: () => void;
};

export function SearchSelect({
  id,
  name,
  value,
  options = [],
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  disabled,
  isLoading,
  hasMore,
  className,
  "aria-invalid": ariaInvalid,
  onChange,
  onBlur,
  onSearchChange,
  onLoadMore,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const currentOption = useMemo(() => options.find((option) => option.value === value), [options, value]);
  const label = currentOption?.label ?? selectedLabel;

  return (
    <Popover open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen);
      if (!nextOpen) onBlur?.();
    }}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          name={name}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={ariaInvalid}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", !label && "text-muted-foreground", className)}
        >
          <span className="truncate">{label || placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <UIInput
            autoFocus
            type="search"
            placeholder={searchPlaceholder}
            className="pl-8"
            onChange={(event) => onSearchChange?.(event.target.value)}
          />
        </div>
        <div
          role="listbox"
          className="max-h-64 overflow-y-auto"
          onScroll={(event) => {
            const target = event.currentTarget;
            if (hasMore && !isLoading && target.scrollHeight - target.scrollTop - target.clientHeight < 48) {
              onLoadMore?.();
            }
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={value === option.value}
              className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              onClick={() => {
                setSelectedLabel(option.label);
                onChange?.(option.value);
                setOpen(false);
              }}
            >
              <Check className={cn("mt-0.5 size-4 shrink-0", value === option.value ? "opacity-100" : "opacity-0")} />
              <span className="break-words">{option.label}</span>
            </button>
          ))}
          {!isLoading && options.length === 0 && <p className="px-2 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>}
          {isLoading && <div className="flex items-center justify-center gap-2 px-2 py-3 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Loading families...</div>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
