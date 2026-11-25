import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, Send, FileText, AlertCircle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ComposePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    senderName: '',
    senderEmail: '',
    subject: '',
    body: '',
    delaySeconds: 2,
    hourlyLimit: 100,
    startAt: new Date(Date.now() + 60000).toISOString().slice(0, 16),
  });

  const [recipients, setRecipients] = useState<string[]>([]);
  const [invalidRecipients, setInvalidRecipients] = useState<string[]>([]);
  const [duplicatesRemoved, setDuplicatesRemoved] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.csv') && !ext.endsWith('.txt')) {
      toast.error('Please upload a CSV or TXT file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/emails/upload-recipients', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRecipients(data.valid);
      setInvalidRecipients(data.invalid);
      setDuplicatesRemoved(data.duplicatesRemoved);
      toast.success(`${data.validCount} valid recipients loaded`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to parse file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeRecipient = (email: string) => {
    setRecipients((prev) => prev.filter((r) => r !== email));
  };

  const handleSubmit = async () => {
    if (submitted || submitting) return;
    if (!form.name || !form.senderName || !form.senderEmail || !form.subject || !form.body) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (recipients.length === 0) {
      toast.error('Please upload recipients');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/campaigns', {
        ...form,
        recipients,
        startAt: new Date(form.startAt).toISOString(),
      });
      setSubmitted(true);
      toast.success(`Campaign created! ${data.emailsScheduled} emails scheduled.`);
      navigate('/campaigns');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create campaign');
    } finally {
      setSubmitting(false);
    }
  };

  const updateForm = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Campaign Info */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Campaign Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
            <input type="text" value={form.name} onChange={(e) => updateForm('name', e.target.value)} className="input-field" placeholder="e.g. November Outreach" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sender Name *</label>
            <input type="text" value={form.senderName} onChange={(e) => updateForm('senderName', e.target.value)} className="input-field" placeholder="e.g. John Smith" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sender Email *</label>
            <input type="email" value={form.senderEmail} onChange={(e) => updateForm('senderEmail', e.target.value)} className="input-field" placeholder="e.g. john@company.com" />
          </div>
        </div>
      </div>

      {/* Email Content */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Email Content</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
            <input type="text" value={form.subject} onChange={(e) => updateForm('subject', e.target.value)} className="input-field" placeholder="Email subject line" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Body (HTML) *</label>
            <textarea
              value={form.body}
              onChange={(e) => updateForm('body', e.target.value)}
              className="input-field min-h-[160px] font-mono text-sm"
              placeholder="<p>Hello,</p><p>Your email body here...</p>"
            />
          </div>
        </div>
      </div>

      {/* Recipients */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Recipients</h3>
        <div className="space-y-4">
          <div
            className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-brand-300 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">{uploading ? 'Processing...' : 'Click to upload CSV or TXT file'}</p>
            <p className="text-xs text-gray-400 mt-1">One email per line, or CSV with email column</p>
          </div>

          {recipients.length > 0 && (
            <div>
              <div className="flex items-center gap-3 text-sm mb-3">
                <span className="text-green-600 font-medium flex items-center gap-1">
                  <FileText className="w-4 h-4" /> {recipients.length} valid
                </span>
                {invalidRecipients.length > 0 && (
                  <span className="text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {invalidRecipients.length} invalid
                  </span>
                )}
                {duplicatesRemoved > 0 && (
                  <span className="text-gray-400">{duplicatesRemoved} duplicates removed</span>
                )}
              </div>
              <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-lg">
                {recipients.slice(0, 50).map((r) => (
                  <div key={r} className="flex items-center justify-between px-3 py-1.5 text-sm border-b border-gray-50 last:border-0">
                    <span className="text-gray-700">{r}</span>
                    <button onClick={() => removeRecipient(r)} className="text-gray-400 hover:text-red-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {recipients.length > 50 && (
                  <p className="px-3 py-2 text-xs text-gray-400">...and {recipients.length - 50} more</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Schedule */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Schedule & Limits</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time</label>
            <input type="datetime-local" value={form.startAt} onChange={(e) => updateForm('startAt', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delay Between Emails (sec)</label>
            <input type="number" min={2} max={3600} value={form.delaySeconds} onChange={(e) => updateForm('delaySeconds', parseInt(e.target.value) || 2)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Sending Limit</label>
            <input type="number" min={1} max={1000} value={form.hourlyLimit} onChange={(e) => updateForm('hourlyLimit', parseInt(e.target.value) || 100)} className="input-field" />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
        <button
          onClick={handleSubmit}
          disabled={submitting || submitted || recipients.length === 0}
          className="btn-primary flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          {submitting ? 'Scheduling...' : submitted ? 'Scheduled!' : 'Schedule Campaign'}
        </button>
      </div>
    </div>
  );
}
