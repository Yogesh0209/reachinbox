import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock, X } from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import { TableSkeleton } from '../components/LoadingSkeleton';
import type { Email, Pagination as PaginationType } from '../types';

export default function ScheduledPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const [emails, setEmails] = useState<Email[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);

  const fetchEmails = async (page = 1) => {
    setLoading(true);
    try {
      const endpoint = query
        ? `/emails/search?q=${encodeURIComponent(query)}&page=${page}&limit=20`
        : `/emails/scheduled?page=${page}&limit=20`;
      const { data } = await api.get(endpoint);
      setEmails(data.emails);
      setPagination(data.pagination);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchEmails(1); }, [query]);

  if (loading) return <div className="card p-4"><TableSkeleton /></div>;
  if (emails.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title={query ? `No results for "${query}"` : 'No scheduled emails'}
        description={query ? 'Try a different search term or clear the filter.' : 'Create a campaign to schedule emails.'}
        action={query ? { label: 'Clear Search', onClick: () => setSearchParams({}) } : undefined}
      />
    );
  }

  return (
    <div className="space-y-4">
      {query && (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm">
          <span className="text-gray-600">Showing search results for <strong className="text-gray-900">"{query}"</strong></span>
          <button onClick={() => setSearchParams({})} className="text-gray-400 hover:text-gray-700 flex items-center gap-1">
            <X className="w-4 h-4" /> Clear
          </button>
        </div>
      )}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Recipient</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Subject</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 hidden md:table-cell">Sender</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 hidden lg:table-cell">Campaign</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Scheduled</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {emails.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-gray-900">{e.recipient}</td>
                  <td className="px-5 py-3 text-gray-600 max-w-[200px] truncate">{e.subject}</td>
                  <td className="px-5 py-3 text-gray-500 hidden md:table-cell">{typeof e.sender === 'string' ? e.sender : e.sender?.email || '—'}</td>
                  <td className="px-5 py-3 text-gray-500 hidden lg:table-cell">{e.campaign?.name || '—'}</td>
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{new Date(e.scheduledAt).toLocaleString()}</td>
                  <td className="px-5 py-3"><StatusBadge status={e.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-100">
          <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onPageChange={fetchEmails} />
        </div>
      </div>
    </div>
  );
}
