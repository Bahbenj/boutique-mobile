import type { ReactNode } from "react";

/** En-tête commun des pages admin : titre, sous-titre, actions. */
export function AdminPage({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
          {description && <p className="mt-1 text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

export function AdminPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl" aria-busy="true">
      <span className="sr-only" role="status">
        Chargement…
      </span>
      <div className="skeleton h-10 w-56 rounded-2xl" />
      <div className="skeleton mt-3 h-4 w-72 max-w-full rounded-full" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-28 rounded-card" />
        ))}
      </div>
      <div className="skeleton mt-6 h-64 rounded-card" />
    </div>
  );
}
