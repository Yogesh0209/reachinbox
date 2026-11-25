import { useState, useEffect } from 'react';
import { MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';
import { IS_DEMO_MODE } from '../services/demoAdapter';
import toast from 'react-hot-toast';
import type { SlackStatus } from '../types';

export default function IntegrationsPage() {
  const [slack, setSlack] = useState<SlackStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const { data } = await api.get('/integrations/slack/status');
      setSlack(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleConnect = async () => {
    if (IS_DEMO_MODE) {
      await api.post('/integrations/slack/demo-connect');
      toast.success('Slack connected (Demo simulation — no real OAuth)');
      fetchStatus();
      return;
    }
    window.location.href = '/api/integrations/slack/connect';
  };

  const handleDisconnect = async () => {
    try {
      await api.post('/integrations/slack/disconnect');
      toast.success('Slack disconnected');
      fetchStatus();
    } catch (err) { toast.error('Failed to disconnect'); }
  };

  return (
    <div className="max-w-2xl">
      <div className="card">
        <div className="px-6 py-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Integrations</h3>
          <p className="text-sm text-gray-500 mt-1">Connect external services for notifications and alerts.</p>
        </div>

        <div className="p-6">
          <div className="flex items-start gap-4 p-4 rounded-lg border border-gray-100">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900">Slack</h4>
                {slack?.connected ? (
                  <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="w-3 h-3" /> Connected</span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-gray-400"><XCircle className="w-3 h-3" /> Not connected</span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">Receive rate-limit notifications in your Slack workspace.</p>
              {slack?.connected && slack.teamName && (
                <p className="text-xs text-gray-400 mt-1">Team: {slack.teamName}</p>
              )}
              <div className="mt-3">
                {slack?.connected ? (
                  <button onClick={handleDisconnect} className="btn-secondary text-sm text-red-600 border-red-200 hover:bg-red-50">Disconnect</button>
                ) : slack?.configured ? (
                  <button onClick={handleConnect} className="btn-primary text-sm">Connect Slack</button>
                ) : (
                  <p className="text-xs text-gray-400">Slack OAuth not configured. Set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
