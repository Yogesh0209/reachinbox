import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, PenSquare } from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import { TableSkeleton } from '../components/LoadingSkeleton';
import type { Campaign, Pagination as PaginationType } from '../types';

export default function CampaignsPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/campaigns?page=${page}&limit=20`);
      setCampaigns(data.campaigns);
      setPagination(data.pagination);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchCampaigns(); }, []);

  if (loading) return <div className="card p-4"><TableSkeleton /></div>;
  if (campaigns.length === 0) {
    return <EmptyState icon={Megaphone} title="No campaigns" description="Create your first email campaign." action={{ label: 'Create Campaign', onClick: () => navigate('/compose') }} />;
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => navigate('/compose')} className="btn-primary flex items-center gap-2 text-sm">
          <PenSquare className="w-4 h-4" /> New Campaign
        </button>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Recipients</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 hidden md:table-cell">Start</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 hidden lg:table-cell">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => navigate(`/campaigns/${c.id}`)}>
                  <td className="px-5 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-5 py-3 text-gray-600">{c.totalRecipients}</td>
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap hidden md:table-cell">{new Date(c.startAt).toLocaleString()}</td>
                  <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-5 py-3 text-gray-400 whitespace-nowrap hidden lg:table-cell">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-100">
          <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onPageChange={fetchCampaigns} />
        </div>
      </div>
    </div>
  );
}
