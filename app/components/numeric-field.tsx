"use client";

import { useId, useState } from "react";

export function NumericField({ label, value, onChange, min = 0, max = 1_000_000_000, step = 1, locale = "en" }: {
  label: string; value: number; onChange: (value: number) => void;
  min?: number; max?: number; step?: number; locale?: "tr" | "en";
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  const [editing, setEditing] = useState(false);
  const parsed = Number(draft);
  const valid = draft.trim() !== "" && Number.isSafeInteger(parsed) && parsed >= min && parsed <= max && (parsed - min) % step === 0;
  const invalid = editing && !valid;
  return <label className="field">
    <span>{label}</span>
    <input aria-label={label} type="number" value={editing ? draft : value} min={min} max={max} step={step}
      aria-invalid={invalid || undefined} aria-describedby={invalid ? id : undefined}
      onFocus={() => { setDraft(String(value)); setEditing(true); }}
      onChange={(event) => {
        const text = event.target.value;
        setDraft(text);
        setEditing(true);
        if (text.trim() !== "" && event.target.validity.valid && Number.isSafeInteger(Number(text))) onChange(Number(text));
      }}
      onBlur={() => setEditing(false)} />
    {invalid && <small id={id} role="status">{locale === "tr" ? `${min}–${max} aralığında, ${step} adımlı bir tam sayı gir. Son geçerli değer kullanılıyor.` : `Enter a whole number from ${min} to ${max} in steps of ${step}. Using the last valid value.`}</small>}
  </label>;
}
