'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { SkipJob, SkipSize, SkipAction, SKIP_SIZES, SKIP_ACTIONS } from '@/lib/types';

type Step = 'size' | 'action' | 'confirm' | 'success' | 'error';

export default function DriverCompletionPage() {
  const params = useParams();
  const token = params.token as string;

  const [job, setJob] = useState<SkipJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [step, setStep] = useState<Step>('size');
  const [skipSize, setSkipSize] = useState<SkipSize | null>(null);
  const [action, setAction] = useState<SkipAction | null>(null);
  const [pickSize, setPickSize] = useState<SkipSize | null>(null);
  const [dropSize, setDropSize] = useState<SkipSize | null>(null);
  const [notes, setNotes] = useState('');
  const [customerSignature, setCustomerSignature] = useState('');
  
  // GPS state
  const [gpsStatus, setGpsStatus] = useState<'pending' | 'captured' | 'denied' | 'error'>('pending');
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);

  useEffect(() => {
    async function loadJob() {
      try {
        const { data, error: fetchError } = await supabase
          .from('skip_jobs')
          .select(`
            *,
            customer:customers(name, address),
            driver:drivers(name)
          `)
          .eq('job_token', token)
          .single();

        if (fetchError || !data) {
          setStep('error');
          setError('Job not found or link expired');
          return;
        }

        const jobData = data as SkipJob;

        if (jobData.status === 'completed') {
          setStep('error');
          setError('This job has already been completed');
          return;
        }

        setJob(jobData);
      } catch (err) {
        console.error('Error loading job:', err);
        setStep('error');
        setError('Failed to load job');
      } finally {
        setLoading(false);
      }
    }

    if (token) loadJob();
  }, [token]);

  // Request GPS when reaching confirm step
  useEffect(() => {
    if (step === 'confirm' && gpsStatus === 'pending') {
      requestLocation();
    }
  }, [step, gpsStatus]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setGpsStatus('captured');
      },
      (err) => {
        console.log('GPS error:', err);
        setGpsStatus('denied');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSelectSize = (size: SkipSize) => {
    setSkipSize(size);
    setStep('action');
  };

  const handleSelectAction = (selectedAction: SkipAction) => {
    setAction(selectedAction);
    if (selectedAction === 'pick_drop') {
      setPickSize(null);
      setDropSize(null);
    } else if (selectedAction === 'pick') {
      setPickSize(null);
      setDropSize(null);
    } else {
      setPickSize(null);
      setDropSize(null);
    }
    setStep('confirm');
  };

  const handleSubmit = async () => {
    if (!action) return;
    if (action === 'pick_drop' && (!pickSize || !dropSize)) {
      setError('Select both removed and left-on-site sizes');
      return;
    }
    if (action === 'pick' && !pickSize) {
      setError('Select the removed skip size');
      return;
    }
    if (action === 'drop' && !dropSize) {
      setError('Select the left-on-site skip size');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/skip-jobs/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          skip_size: skipSize || undefined,
          action,
          pick_size: pickSize || undefined,
          drop_size: dropSize || undefined,
          lat: location?.lat,
          lng: location?.lng,
          accuracy_m: location?.accuracy,
          driver_notes: notes || undefined,
          customer_signature: customerSignature || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete job');
      }

      setStep('success');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center ">
        <div className="text-xl text-white">Loading job...</div>
      </div>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center  p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-white mb-2">Error</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  // Success state
  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center  p-4">
        <div className="text-center">
          <div className="text-8xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-white mb-2">Job Completed!</h1>
          <p className="text-green-200 text-lg">Docket sent to office</p>
          <p className="text-green-300 mt-4">You can close this page</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen text-white"
      
    >
      {/* Logo Header */}
      <div className="py-4 flex justify-center bg-gradient-to-b from-[#1a1a1a] to-transparent">
        <a href="/">
          <img 
            src="/imr-logo.png" 
            alt="Irish Metals Recycling" 
            className="h-20 drop-shadow-2xl"
          />
        </a>
      </div>

      {/* Job Info Card */}
      <div className="mx-4 mb-4 bg-gradient-to-br from-gray-800/90 to-gray-900/95 backdrop-blur-lg rounded-2xl p-4 border border-gray-700/50 shadow-lg">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-sm text-gray-400">Docket</div>
            <div className="text-xl font-bold text-blue-400 font-mono">{job?.docket_no}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Driver</div>
            <div className="text-lg font-bold text-green-400">{job?.driver?.name}</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-700/50">
          <div className="text-sm text-gray-400">Customer</div>
          <div className="font-semibold text-lg">{job?.customer?.name}</div>
          {job?.customer?.address && (
            <div className="text-sm text-gray-400 mt-1">📍 {job.customer.address}</div>
          )}
        </div>
        {job?.notes && (
          <div className="mt-3 pt-3 border-t border-gray-700/50">
            <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-3">
              <div className="text-sm text-yellow-400 font-medium">📝 Notes from office</div>
              <div className="text-yellow-200 mt-1">{job.notes}</div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        {/* Step 1: Skip Size */}
        {step === 'size' && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-center">Select Skip Size</h2>
            <div className="grid grid-cols-2 gap-3">
              {SKIP_SIZES.map((size) => (
                <button
                  key={size.value}
                  onClick={() => handleSelectSize(size.value)}
                  className="py-6 px-4 bg-blue-600 hover:bg-blue-700 rounded-xl text-2xl font-bold transition-colors active:scale-95"
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Action */}
        {step === 'action' && (
          <div>
            <div className="mb-4">
              <button
                onClick={() => setStep('size')}
                className="text-blue-400 text-sm"
              >
                ← Back
              </button>
            </div>
            <div className="bg-gray-600/40 rounded-lg p-3 mb-4 border border-gray-500/40">
              <span className="text-gray-400">Skip Size:</span>{' '}
              <span className="font-bold">{SKIP_SIZES.find(s => s.value === skipSize)?.label}</span>
            </div>
            <h2 className="text-xl font-semibold mb-4 text-center">Select Action</h2>
            <div className="space-y-3">
              {SKIP_ACTIONS.map((act) => (
                <button
                  key={act.value}
                  onClick={() => handleSelectAction(act.value)}
                  className="w-full py-5 px-4 bg-green-600 hover:bg-green-700 rounded-xl text-xl font-bold transition-colors active:scale-95"
                >
                  {act.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && (
          <div>
            <div className="mb-4">
              <button
                onClick={() => setStep('action')}
                className="text-blue-400 text-sm"
              >
                ← Back
              </button>
            </div>

            <h2 className="text-xl font-semibold mb-4 text-center">Confirm Job</h2>

            {/* Summary */}
            <div className="bg-gray-600/40 rounded-lg p-4 mb-4 space-y-2 border border-gray-500/40">
              <div className="flex justify-between">
                <span className="text-gray-400">Skip Size:</span>
                <span className="font-bold">{SKIP_SIZES.find(s => s.value === skipSize)?.label || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Action:</span>
                <span className="font-bold">{SKIP_ACTIONS.find(a => a.value === action)?.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Time:</span>
                <span className="font-bold">{new Date().toLocaleTimeString('en-IE')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Date:</span>
                <span className="font-bold">{new Date().toLocaleDateString('en-IE')}</span>
              </div>
            </div>

            {action === 'pick_drop' && (
              <div className="bg-gray-600/40 rounded-lg p-4 mb-4 space-y-3 border border-gray-500/40">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Removed Skip Size</label>
                  <div className="grid grid-cols-3 gap-2">
                    {SKIP_SIZES.map((size) => (
                      <button
                        key={`pick-${size.value}`}
                        onClick={() => setPickSize(size.value)}
                        className={`py-2 rounded-lg font-bold ${pickSize === size.value ? 'bg-red-600' : 'bg-gray-500/60'}`}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Left on Site (New Skip)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {SKIP_SIZES.map((size) => (
                      <button
                        key={`drop-${size.value}`}
                        onClick={() => setDropSize(size.value)}
                        className={`py-2 rounded-lg font-bold ${dropSize === size.value ? 'bg-green-600' : 'bg-gray-500/60'}`}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {action === 'drop' && (
              <div className="bg-gray-600/40 rounded-lg p-4 mb-4 space-y-3 border border-gray-500/40">
                <label className="block text-sm text-gray-400 mb-2">Skip Size Left on Site</label>
                <div className="grid grid-cols-3 gap-2">
                  {SKIP_SIZES.map((size) => (
                    <button
                      key={`drop-only-${size.value}`}
                      onClick={() => setDropSize(size.value)}
                      className={`py-2 rounded-lg font-bold ${dropSize === size.value ? 'bg-green-600' : 'bg-gray-500/60'}`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {action === 'pick' && (
              <div className="bg-gray-600/40 rounded-lg p-4 mb-4 space-y-3 border border-gray-500/40">
                <label className="block text-sm text-gray-400 mb-2">Skip Size Removed</label>
                <div className="grid grid-cols-3 gap-2">
                  {SKIP_SIZES.map((size) => (
                    <button
                      key={`pick-only-${size.value}`}
                      onClick={() => setPickSize(size.value)}
                      className={`py-2 rounded-lg font-bold ${pickSize === size.value ? 'bg-red-600' : 'bg-gray-500/60'}`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* GPS Status */}
            <div className="bg-gray-600/40 rounded-lg p-4 mb-4 border border-gray-500/40">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Location:</span>
                <div>
                  {gpsStatus === 'pending' && (
                    <span className="text-yellow-400">📍 Requesting...</span>
                  )}
                  {gpsStatus === 'captured' && (
                    <span className="text-green-400">✅ GPS captured</span>
                  )}
                  {gpsStatus === 'denied' && (
                    <span className="text-orange-400">⚠️ GPS not captured</span>
                  )}
                  {gpsStatus === 'error' && (
                    <span className="text-red-400">❌ GPS unavailable</span>
                  )}
                </div>
              </div>
              {gpsStatus === 'denied' && (
                <button
                  onClick={requestLocation}
                  className="mt-2 text-sm text-blue-400 underline"
                >
                  Try again
                </button>
              )}
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-gray-500/40 border border-gray-500/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any issues or comments..."
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">
                Customer Signature (name)
              </label>
              <input
                value={customerSignature}
                onChange={(e) => setCustomerSignature(e.target.value)}
                className="w-full px-3 py-2 bg-gray-500/40 border border-gray-500/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Customer name"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-900/50 text-red-200 rounded-lg">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-xl text-2xl font-bold transition-colors active:scale-95"
            >
              {submitting ? 'Submitting...' : '✓ Confirm & Complete'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
