import { useState } from "react";
import { isValidMobile, mobileDigits } from "@/lib/validation";

/** Indian mobile input: fixed +91 prefix, digits only, exactly 10. `value` is the 10 digits. */
export function PhoneInput({ value, onChange, id, disabled, required }: { value: string; onChange: (digits: string) => void; id?: string; disabled?: boolean; required?: boolean }) {
  const [touched, setTouched] = useState(false);
  const bad = touched && value.length > 0 && !isValidMobile(value);
  return (
    <div>
      <div className={`flex overflow-hidden rounded-xl border bg-background focus-within:ring-2 focus-within:ring-ring ${bad ? "border-destructive" : "border-input"}`}>
        <span className="grid place-items-center border-r border-input bg-muted px-3 text-base font-semibold text-muted-foreground">+91</span>
        <input
          id={id}
          value={value}
          disabled={disabled}
          required={required}
          onChange={(e) => onChange(mobileDigits(e.target.value))}
          onBlur={() => setTouched(true)}
          inputMode="numeric"
          autoComplete="tel-national"
          pattern="[6-9][0-9]{9}"
          placeholder="98765 43210"
          aria-invalid={bad}
          className="w-full bg-transparent px-4 py-3 text-base outline-none"
        />
      </div>
      {bad && <p className="mt-1 text-sm text-destructive">Enter a 10-digit mobile number starting with 6, 7, 8 or 9.</p>}
    </div>
  );
}
