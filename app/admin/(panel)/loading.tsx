/** Squelette commun des pages de l'admin pendant le chargement (le menu reste affiché). */
export default function AdminLoading() {
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">
        Chargement…
      </span>
      <div className="skeleton h-10 w-56 max-w-full rounded-2xl" />
      <div className="skeleton mt-3 h-4 w-40 rounded-full" />
      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-28 rounded-card" />
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-16 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
