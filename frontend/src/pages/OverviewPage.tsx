import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Send, AlertTriangle, Mail, PenSquare, BarChart3 } from 'lucide-react';
import api from '../services/api';
import { IS_DEMO_MODE } from '../services/demoAdapter';
import toast from 'react-hot-toast';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { CardSkeleton } from '../components/LoadingSkeleton';
import type { EmailStats, Email } from '../types';

export default function OverviewPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [recentScheduled, setRecentScheduled] = useState<Email[]>([]);
  const [recentSent, setRecentSent] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, scheduledRes, sentRes] = await Promise.all([
          api.get('/emails/stats'),
          api.get('/emails/scheduled?limit=5'),
          api.get('/emails/sent?limit=5'),
        ]);
        setStats(statsRes.data.stats);
        setRecentScheduled(scheduledRes.data.emails);
        setRecentSent(sentRes.data.emails);
      } catch (err) {
        console.error('Failed to load overview:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Emails" value={stats?.total || 0} icon={Mail} color="text-brand-600" bgColor="bg-brand-50" />
        <StatCard title="Scheduled" value={stats?.scheduled || 0} icon={Clock} color="text-blue-600" bgColor="bg-blue-50" />
        <StatCard title="Sent" value={stats?.sent || 0} icon={Send} color="text-green-600" bgColor="bg-green-50" />
        <StatCard title="Failed" value={stats?.failed || 0} icon={AlertTriangle} color="text-red-600" bgColor="bg-red-50" />
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <button onClick={() => navigate('/compose')} className="btn-primary flex items-center gap-2 text-sm">
          <PenSquare className="w-4 h-4" /> New Campaign
        </button>
        {IS_DEMO_MODE ? (
          <button
            onClick={() => toast('Bull Board requires live Redis + Backend. Scheduling is simulated in Demo Mode.', { icon: 'ℹ️' })}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <BarChart3 className="w-4 h-4" /> Bull Board (Simulated)
          </button>
        ) : (
          <a href="/admin/queues" target="_blank" rel="noreferrer" className="btn-secondary flex items-center gap-2 text-sm">
            <BarChart3 className="w-4 h-4" /> Bull Board
          </a>
        )}
      </div>

      {/* Recent Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Scheduled */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recent Scheduled</h3>
            <button onClick={() => navigate('/scheduled')} className="text-sm text-brand-600 hover:text-brand-700">View all</button>
          </div>
          <div className="divide-y divide-gray-50">
            {recentScheduled.length === 0 ? (
              <p className="p-5 text-sm text-gray-400 text-center">No scheduled emails</p>
            ) : recentScheduled.map((e) => (
              <div key={e.id} className="px-5 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{e.recipient}</p>
                  <p className="text-xs text-gray-500 truncate">{e.subject}</p>
                </div>
                <StatusBadge status={e.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sent */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recent Sent</h3>
            <button onClick={() => navigate('/sent')} className="text-sm text-brand-600 hover:text-brand-700">View all</button>
          </div>
          <div className="divide-y divide-gray-50">
            {recentSent.length === 0 ? (
              <p className="p-5 text-sm text-gray-400 text-center">No sent emails yet</p>
            ) : recentSent.map((e) => (
              <div key={e.id} className="px-5 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{e.recipient}</p>
                  <p className="text-xs text-gray-500 truncate">{e.subject}</p>
                </div>
                <div className="text-xs text-gray-400">{e.sentAt ? new Date(e.sentAt).toLocaleString() : '—'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
