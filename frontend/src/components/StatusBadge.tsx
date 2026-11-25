interface Props { status: string; }

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-blue-50 text-blue-700 border-blue-200',
  QUEUED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  PROCESSING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  SENT: 'bg-green-50 text-green-700 border-green-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
  RATE_LIMITED: 'bg-orange-50 text-orange-700 border-orange-200',
  CANCELLED: 'bg-gray-50 text-gray-500 border-gray-200',
  DRAFT: 'bg-gray-50 text-gray-600 border-gray-200',
  RUNNING: 'bg-blue-50 text-blue-700 border-blue-200',
  COMPLETED: 'bg-green-50 text-green-700 border-green-200',
  PAUSED: 'bg-yellow-50 text-yellow-700 border-yellow-200',
};

export default function StatusBadge({ status }: Props) {
  const color = statusColors[status] || 'bg-gray-50 text-gray-600 border-gray-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
