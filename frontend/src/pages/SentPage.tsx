import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import { TableSkeleton } from '../components/LoadingSkeleton';
import type { Email, Pagination as PaginationType } from '../types';

export default function SentPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);

  const fetchEmails = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/emails/sent?page=${page}&limit=20`);
      setEmails(data.emails);
      setPagination(data.pagination);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchEmails(); }, []);

  if (loading) return <div className="card p-4"><TableSkeleton /></div>;
  if (emails.length === 0) return <EmptyState icon={Send} title="No sent emails" description="Emails will appear here once they are sent." />;

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-5 py-3 font-medium text-gray-500">Recipient</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Subject</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500 hidden md:table-cell">Sender</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Sent At</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {emails.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50/50">
                <td className="px-5 py-3 font-medium text-gray-900">{e.recipient}</td>
                <td className="px-5 py-3 text-gray-600 max-w-[200px] truncate">{e.subject}</td>
                <td className="px-5 py-3 text-gray-500 hidden md:table-cell">{e.sender?.email || '—'}</td>
                <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{e.sentAt ? new Date(e.sentAt).toLocaleString() : '—'}</td>
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
  );
}
