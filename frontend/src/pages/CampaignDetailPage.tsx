import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Send, AlertTriangle, Mail, Play, Trash2 } from 'lucide-react';
import api from '../services/api';
import { IS_DEMO_MODE } from '../services/demoAdapter';
import toast from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';
import StatCard from '../components/StatCard';
import { TableSkeleton } from '../components/LoadingSkeleton';
import type { Campaign, Email } from '../types';

export default function CampaignDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [emailStats, setEmailStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await api.get(`/campaigns/${id}`);
      setCampaign(data.campaign);
      setEmails(data.campaign.emails || []);
      setEmailStats(data.emailStats || {});
    } catch (err) { console.error(err); navigate('/campaigns'); } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
  }, [id, navigate]);

  const handleSimulateSend = async () => {
    try {
      const { data } = await api.post(`/campaigns/${id}/simulate-send`);
      toast.success(`Simulated delivery for ${data.simulatedCount} email(s) (no real SMTP sent)`);
      load();
    } catch {
      toast.error('Failed to simulate send');
    }
  };

  const handleDeleteCampaign = async () => {
    try {
      await api.delete(`/campaigns/${id}`);
      toast.success('Campaign cancelled');
      load();
    } catch {
      toast.error('Failed to cancel campaign');
    }
  };

  if (loading) return <div className="card p-4"><TableSkeleton /></div>;
  if (!campaign) return null;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/campaigns')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to Campaigns
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{campaign.name}</h2>
          <p className="text-sm text-gray-500 mt-1">Subject: {campaign.subject}</p>
        </div>
        <div className="flex items-center gap-2">
          {IS_DEMO_MODE && ((emailStats.SCHEDULED || 0) + (emailStats.QUEUED || 0) + (emailStats.RATE_LIMITED || 0) > 0) && (
            <button onClick={handleSimulateSend} className="btn-primary flex items-center gap-1.5 text-sm">
              <Play className="w-3.5 h-3.5" /> Simulate Send
            </button>
          )}
          {campaign.status !== 'COMPLETED' && campaign.status !== 'FAILED' && (
            <button onClick={handleDeleteCampaign} className="btn-secondary text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1.5 text-sm">
              <Trash2 className="w-3.5 h-3.5" /> Cancel
            </button>
          )}
          <StatusBadge status={campaign.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total" value={campaign.totalRecipients} icon={Mail} color="text-brand-600" bgColor="bg-brand-50" />
        <StatCard title="Scheduled" value={emailStats.SCHEDULED || 0} icon={Clock} color="text-blue-600" bgColor="bg-blue-50" />
        <StatCard title="Sent" value={emailStats.SENT || 0} icon={Send} color="text-green-600" bgColor="bg-green-50" />
        <StatCard title="Failed" value={emailStats.FAILED || 0} icon={AlertTriangle} color="text-red-600" bgColor="bg-red-50" />
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Emails</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Recipient</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Scheduled</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 hidden md:table-cell">Sent At</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {emails.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-gray-900">{e.recipient}</td>
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{new Date(e.scheduledAt).toLocaleString()}</td>
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap hidden md:table-cell">{e.sentAt ? new Date(e.sentAt).toLocaleString() : '—'}</td>
                  <td className="px-5 py-3"><StatusBadge status={e.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
