import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="max-w-2xl">
      <div className="card">
        <div className="px-6 py-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
          <p className="text-sm text-gray-500 mt-1">Application configuration and preferences.</p>
        </div>
        <div className="p-6">
          <div className="flex flex-col items-center py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Settings className="w-7 h-7 text-gray-400" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900">System Settings</h4>
            <p className="text-sm text-gray-500 mt-1">Configuration is managed via environment variables.</p>
            <div className="mt-6 w-full max-w-sm space-y-3 text-left">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-500">Worker Concurrency</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">WORKER_CONCURRENCY</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-500">Min Delay Between Emails</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">MIN_DELAY_BETWEEN_EMAILS_MS</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-500">Max Emails Per Hour Per Sender</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">MAX_EMAILS_PER_HOUR_PER_SENDER</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
