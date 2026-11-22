"use client";

import { FIELD_LABELS, NOTIFIABLE_FIELDS, type NotifiableField } from "@ipl/shared";
import { cn } from "@/lib/utils";

export function FieldSelector({
  fields,
  onChange,
  disabled = false,
  saving = false,
}: {
  fields: NotifiableField[];
  onChange: (fields: NotifiableField[]) => void;
  disabled?: boolean;
  saving?: boolean;
}) {
  const allSelected = fields.length === NOTIFIABLE_FIELDS.length;

  const toggle = (field: NotifiableField) => {
    onChange(fields.includes(field) ? fields.filter((value) => value !== field) : [...fields, field]);
  };

  return (
    <fieldset className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <legend className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Notify me about
        </legend>
        <span className="text-[10px] text-muted-foreground" aria-live="polite">
          {saving ? "Saving…" : fields.length === 0 ? "Nothing selected" : `${fields.length} selected`}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          aria-pressed={allSelected}
          disabled={disabled}
          onClick={() => onChange([...NOTIFIABLE_FIELDS])}
          className={cn(
            "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60",
            allSelected
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          Everything
        </button>
        {NOTIFIABLE_FIELDS.map((field) => {
          const active = fields.includes(field);
          return (
            <button
              key={field}
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => toggle(field)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60",
                active
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {FIELD_LABELS[field]}
            </button>
          );
        })}
      </div>
      {fields.length === 0 ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          You stay followed, but no notifications will be created for this team.
        </p>
      ) : null}
    </fieldset>
  );
}
