'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { SkipJob, SkipJobCompletion, STATUS_COLORS, SKIP_SIZES, SKIP_ACTIONS } from '@/lib/types';

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;

  const [job, setJob] = useState<SkipJob | null>(null);
  const [completion, setCompletion] = useState<SkipJobCompletion | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingWeight, setEditingWeight] = useState(false);
  const [weightValue, setWeightValue] = useState<string>('');
  const [materialType, setMaterialType] = useState<string>('');

  useEffect(() => {
    async function loadJob() {
      try {
        const { data: jobData, error: jobError } = await supabase
          .from('skip_jobs')
          .select(`
            *,
            customer:customers(name, address, contact_phone),
            driver:drivers(name, phone)
          `)
          .eq('id', jobId)
          .single();

        if (jobError) throw jobError;
        setJob(jobData);

        // Load completion if exists
        if (jobData?.status === 'completed') {
          const { data: completionData } = await supabase
            .from('skip_job_completion')
            .select('*')
            .eq('skip_job_id', jobId)
            .single();
          
          setCompletion(completionData);
        }
      } catch (err) {
        console.error('Error loading job:', err);
      } finally {
        setLoading(false);
      }
    }

    if (jobId) loadJob();
  }, [jobId]);

  const handleResend = async () => {
    if (!job) return;
    
    try {
      const res = await fetch('/api/skip-jobs/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(`SMS sent!\n\nDriver link: ${data.driver_link}`);
        window.location.reload();
      } else {
        alert('Failed: ' + data.error);
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Failed to send');
    }
  };

  const copyDriverLink = () => {
    if (!job) return;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const link = `${appUrl}/driver/skip/${job.job_token}`;
    navigator.clipboard.writeText(link);
    alert('Driver link copied to clipboard!');
  };

  const startEditingWeight = () => {
    setMaterialType(completion?.material_type || '');
    setWeightValue(completion?.net_weight_kg?.toString() || '');
    setEditingWeight(true);
  };

  const cancelEditingWeight = () => {
    setEditingWeight(false);
    setWeightValue('');
    setMaterialType('');
  };

  const saveWeight = async () => {
    if (!completion) return;

    const weight = weightValue.trim() === '' ? null : parseFloat(weightValue);

    if (weight !== null && (isNaN(weight) || weight < 0)) {
      alert('Please enter a valid weight (positive number)');
      return;
    }

    try {
      const res = await fetch('/api/skip-jobs/update-weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completion_id: completion.id,
          material_type: materialType.trim() || null,
          net_weight_kg: weight,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setCompletion(data.completion);
        setEditingWeight(false);
        setWeightValue('');
        setMaterialType('');
      } else {
        alert('Failed: ' + data.error);
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Failed to update weight');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Job not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{job.docket_no}</h1>
              <span
                className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${
                  STATUS_COLORS[job.status]
                }`}
              >
                {job.status.toUpperCase()}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyDriverLink}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
              >
                Copy Link
              </button>
              {job.status !== 'completed' && (
                <button
                  onClick={handleResend}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                >
                  {job.status === 'created' ? 'Send SMS' : 'Resend SMS'}
                </button>
              )}
            </div>
          </div>

          {/* Job Details */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-sm text-gray-500">Customer</label>
              <p className="font-medium">{job.customer?.name || '-'}</p>
              {job.customer?.address && (
                <p className="text-sm text-gray-600">{job.customer.address}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-500">Job Date</label>
              <p className="font-medium">
                {new Date(job.job_date).toLocaleDateString('en-IE', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Driver</label>
              <p className="font-medium">{job.driver?.name || '-'}</p>
              {job.driver?.phone && (
                <p className="text-sm text-gray-600">{job.driver.phone}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-500">Truck Reg</label>
              <p className="font-medium">{job.truck_reg}</p>
            </div>
          </div>

          {job.notes && (
            <div className="mb-6">
              <label className="text-sm text-gray-500">Notes</label>
              <p className="text-gray-700">{job.notes}</p>
            </div>
          )}

          {/* Timeline */}
          <div className="border-t pt-4 mb-6">
            <h3 className="font-semibold mb-3">Timeline</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created:</span>
                <span>{new Date(job.created_at).toLocaleString('en-IE')}</span>
              </div>
              {job.sent_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Sent to driver:</span>
                  <span>{new Date(job.sent_at).toLocaleString('en-IE')}</span>
                </div>
              )}
              {job.completed_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Completed:</span>
                  <span>{new Date(job.completed_at).toLocaleString('en-IE')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Completion Details */}
          {completion && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Completion Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Skip Size</label>
                  <p className="font-medium text-lg">
                    {SKIP_SIZES.find(s => s.value === completion.skip_size)?.label || completion.skip_size}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Action</label>
                  <p className="font-medium text-lg">
                    {SKIP_ACTIONS.find(a => a.value === completion.action)?.label || completion.action}
                  </p>
                </div>
                {completion.pick_size && (
                  <div>
                    <label className="text-sm text-gray-500">Removed Skip</label>
                    <p className="font-medium">
                      {SKIP_SIZES.find(s => s.value === completion.pick_size)?.label || completion.pick_size}
                    </p>
                  </div>
                )}
                {completion.drop_size && (
                  <div>
                    <label className="text-sm text-gray-500">Left on Site</label>
                    <p className="font-medium">
                      {SKIP_SIZES.find(s => s.value === completion.drop_size)?.label || completion.drop_size}
                    </p>
                  </div>
                )}
                <div className="col-span-2">
                  <label className="text-sm text-gray-500">Material Type & Net Weight</label>
                  {editingWeight ? (
                    <div className="space-y-2 mt-1">
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={materialType}
                          onChange={(e) => setMaterialType(e.target.value)}
                          placeholder="Material type (e.g., Metal, Wood)"
                          className="border border-gray-300 rounded px-3 py-1 flex-1"
                        />
                      </div>
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          value={weightValue}
                          onChange={(e) => setWeightValue(e.target.value)}
                          placeholder="Enter weight in kg"
                          className="border border-gray-300 rounded px-3 py-1 w-40"
                          step="0.01"
                          min="0"
                        />
                        <span className="text-gray-500">kg</span>
                        <button
                          onClick={saveWeight}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditingWeight}
                          className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <p className="font-medium">
                        {completion.material_type && <span className="text-blue-600">{completion.material_type} - </span>}
                        {completion.net_weight_kg ? `${completion.net_weight_kg} kg` : 'Not recorded'}
                      </p>
                      <button
                        onClick={startEditingWeight}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
                {completion.pick_lat && completion.pick_lng && (
                  <div className="col-span-2">
                    <label className="text-sm text-gray-500">Pick Location (Yard)</label>
                    <p className="font-medium">
                      {completion.pick_lat.toFixed(6)}, {completion.pick_lng.toFixed(6)}
                    </p>
                    <a
                      href={`https://www.google.com/maps?q=${completion.pick_lat},${completion.pick_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Open in Google Maps →
                    </a>
                  </div>
                )}
                {completion.drop_lat && completion.drop_lng && (
                  <div className="col-span-2">
                    <label className="text-sm text-gray-500">Drop Location (Site)</label>
                    <p className="font-medium">
                      {completion.drop_lat.toFixed(6)}, {completion.drop_lng.toFixed(6)}
                    </p>
                    <a
                      href={`https://www.google.com/maps?q=${completion.drop_lat},${completion.drop_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Open in Google Maps →
                    </a>
                  </div>
                )}
                {completion.customer_signature && (
                  <div className="col-span-2">
                    <label className="text-sm text-gray-500">Customer Signature</label>
                    <p className="text-gray-700">{completion.customer_signature}</p>
                  </div>
                )}
                {completion.driver_notes && (
                  <div className="col-span-2">
                    <label className="text-sm text-gray-500">Driver Notes</label>
                    <p className="text-gray-700">{completion.driver_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <a href="/office/skips" className="text-blue-600 hover:underline">
            ← Back to Jobs List
          </a>
        </div>
      </div>
    </div>
  );
}
