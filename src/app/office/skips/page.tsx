'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { SkipJob, STATUS_COLORS, JobStatus, SKIP_SIZES } from '@/lib/types';

export default function SkipJobsListPage() {
  const [jobs, setJobs] = useState<SkipJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<JobStatus | 'all'>('all');

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('skip_jobs')
        .select(`
          *,
          customer:customers(name),
          driver:drivers(name),
          completion:skip_job_completion(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (err) {
      console.error('Error loading jobs:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredJobs = filter === 'all' 
    ? jobs 
    : jobs.filter(j => j.status === filter);

  const todayJobs = jobs.filter(j => {
    const today = new Date().toISOString().split('T')[0];
    return j.job_date === today;
  });

  const getTrafficLight = (job: SkipJob) => {
    if (job.status === 'completed') return { label: 'Done', className: 'bg-green-500 text-white' };
    const createdAt = new Date(job.created_at);
    const daysWaiting = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysWaiting >= 5) return { label: 'Waiting 5+ days', className: 'bg-amber-500 text-white' };
    return { label: 'Waiting', className: 'bg-red-500 text-white' };
  };

  const handleResend = async (jobId: string) => {
    try {
      const res = await fetch('/api/skip-jobs/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(`SMS resent!\n\nDriver link: ${data.driver_link}`);
        loadJobs();
      } else {
        alert('Failed to resend: ' + data.error);
      }
    } catch (err) {
      console.error('Resend error:', err);
      alert('Failed to resend');
    }
  };

  const handleDelete = async (job: SkipJob) => {
    if (job.status === 'completed') {
      alert('Cannot delete completed jobs');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete this job?\n\nDocket: ${job.docket_no}\nCustomer: ${job.customer?.name || 'Unknown'}\n\nThis cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const res = await fetch('/api/skip-jobs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id }),
      });

      const data = await res.json();

      if (res.ok) {
        loadJobs();
      } else {
        alert('Failed to delete: ' + data.error);
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete job');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading jobs...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 pb-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Image
              src="/imr-logo.png"
              alt="Irish Metals Logo"
              width={140}
              height={50}
              priority
            />
            <h1 className="text-2xl font-bold text-white">Skip Jobs</h1>
          </div>
          <a
            href="/office/skips/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700"
          >
            + New Job
          </a>
        </div>

        {/* Today's summary */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">Today’s Jobs</h2>
          <div className="flex gap-4 text-sm">
            <span className="px-3 py-1 bg-gray-100 rounded-full">
              Total: {todayJobs.length}
            </span>
            <span className="px-3 py-1 bg-gray-200 rounded-full">
              Created: {todayJobs.filter(j => j.status === 'created').length}
            </span>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
              Sent: {todayJobs.filter(j => j.status === 'sent').length}
            </span>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full">
              Completed: {todayJobs.filter(j => j.status === 'completed').length}
            </span>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-4 flex gap-2">
          {(['all', 'created', 'sent', 'completed', 'cancelled'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Jobs list */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {filteredJobs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
              No jobs found. Create your first job!
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Docket No
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Driver
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Truck
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Site / Size
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredJobs.map(job => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">
                      {job.docket_no}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {new Date(job.job_date).toLocaleDateString('en-IE')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {job.customer?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {job.driver?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {job.truck_reg}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            STATUS_COLORS[job.status]
                          }`}
                        >
                          {job.status}
                        </span>
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getTrafficLight(job).className}`}
                        >
                          {getTrafficLight(job).label}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className="font-medium">{job.customer?.name || "-"}</div>
                      <div className="text-xs text-gray-500">
                        Left: {job.completion?.drop_size ? SKIP_SIZES.find(s => s.value === job.completion?.drop_size)?.label : "-"}
                        {job.completion?.pick_size ? ` • Picked: ${SKIP_SIZES.find(s => s.value === job.completion?.pick_size)?.label}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {job.completion?.pick_lat && job.completion?.pick_lng ? (
                        <div className="text-xs">
                          <div>
                            Yard:{' '}
                            <a
                              href={`https://www.google.com/maps?q=${job.completion.pick_lat},${job.completion.pick_lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {job.completion.pick_lat.toFixed(5)}, {job.completion.pick_lng.toFixed(5)}
                            </a>
                          </div>
                          {job.completion.drop_lat && job.completion.drop_lng && (
                            <div>
                              Site:{' '}
                              <a
                                href={`https://www.google.com/maps?q=${job.completion.drop_lat},${job.completion.drop_lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {job.completion.drop_lat.toFixed(5)}, {job.completion.drop_lng.toFixed(5)}
                              </a>
                            </div>
                          )}
                        </div>
                      ) : job.completion?.drop_lat && job.completion?.drop_lng ? (
                        <a
                          href={`https://www.google.com/maps?q=${job.completion.drop_lat},${job.completion.drop_lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {job.completion.drop_lat.toFixed(5)}, {job.completion.drop_lng.toFixed(5)}
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <a
                          href={`/office/skips/${job.id}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          View
                        </a>
                        {job.status !== 'completed' && (
                          <a
                            href={`/office/skips/${job.id}/edit`}
                            className="text-sm text-orange-600 hover:underline"
                          >
                            Edit
                          </a>
                        )}
                        {(job.status === 'created' || job.status === 'sent') && (
                          <button
                            onClick={() => handleResend(job.id)}
                            className="text-sm text-green-600 hover:underline"
                          >
                            {job.status === 'created' ? 'Send' : 'Resend'}
                          </button>
                        )}
                        {job.status !== 'completed' && (
                          <button
                            onClick={() => handleDelete(job)}
                            className="text-sm text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}


