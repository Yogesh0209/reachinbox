export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      <div className="h-10 bg-gray-100 rounded-t-lg mb-1" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 bg-gray-50 border-b border-gray-100" />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-4 bg-gray-100 rounded w-24 mb-2" />
          <div className="h-7 bg-gray-100 rounded w-16" />
        </div>
        <div className="w-11 h-11 bg-gray-100 rounded-xl" />
      </div>
    </div>
  );
}
