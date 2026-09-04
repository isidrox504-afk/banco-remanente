export default function LoadingAdmin() {
  return (
    <div className="animate-pulse">
      <div className="mb-8">
        <div className="h-8 w-56 rounded-lg bg-slate-200" />
        <div className="mt-3 h-4 w-80 max-w-full rounded bg-slate-200" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="h-28 rounded-2xl bg-slate-200" />
        <div className="h-28 rounded-2xl bg-slate-200" />
        <div className="h-28 rounded-2xl bg-slate-200" />
        <div className="h-28 rounded-2xl bg-slate-200" />
      </div>

      <div className="mt-8 h-64 rounded-2xl bg-slate-200" />
    </div>
  );
}