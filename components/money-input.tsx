"use client";

import { Input } from "@/components/ui/input";
import { takaToPaisa } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Money input that displays a decimal taka value and emits integer paisa.
 * `value` is paisa, `onChange` receives paisa.
 */
export function MoneyInput({
  value,
  onChange,
  className,
  placeholder = "0.00",
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> & {
  value: number | null;
  onChange: (paisa: number) => void;
}) {
  const display = value === null || value === undefined ? "" : String(value / 100);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        ৳
      </span>
      <Input
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        className={cn("pl-7", className)}
        placeholder={placeholder}
        value={display}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange(0);
            return;
          }
          const taka = Number(raw);
          if (Number.isFinite(taka)) {
            onChange(takaToPaisa(taka));
          }
        }}
        {...props}
      />
    </div>
  );
}
