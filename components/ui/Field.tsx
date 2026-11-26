import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full min-w-0 rounded-2xl border border-line bg-raised px-4 text-[1rem] text-fg placeholder:text-fg/45 " +
  "transition-[border-color,box-shadow] outline-none focus:border-accent focus:ring-4 focus:ring-accent/25 " +
  "aria-[invalid=true]:border-danger";

type FieldProps = { label: ReactNode; error?: string; hint?: ReactNode; className?: string };

/** Champ de formulaire libellé (16px mini pour éviter le zoom iOS). */
export function Field({ label, error, hint, className, ...input }: FieldProps & ComponentProps<"input">) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-fg">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className={cn(control, "h-12")}
        {...input}
      />
      {hint && !error && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function SelectField({
  label,
  error,
  className,
  children,
  ...select
}: FieldProps & ComponentProps<"select">) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-fg">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className={cn(control, "h-12 appearance-none bg-[length:16px] bg-[position:right_1rem_center] bg-no-repeat pe-10")}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a1a9ba' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        }}
        {...select}
      >
        {children}
      </select>
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextareaField({ label, className, ...props }: FieldProps & ComponentProps<"textarea">) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-fg">
        {label}
      </label>
      <textarea id={id} className={cn(control, "min-h-24 py-3")} {...props} />
    </div>
  );
}
