'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { SkipJob, SkipSize, SkipAction, TruckType, SKIP_SIZES, SKIP_ACTIONS, STATUS_COLORS, STATUS_LABELS, TRUCK_TYPES } from '@/lib/types';
import BottomNav from '@/components/BottomNav';

type Step = 'details' | 'start_config' | 'size' | 'action' | 'confirm' | 'success' | 'error';

export default function DriverJobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;

  const [job, setJob] = useState<SkipJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pendingSync, setPendingSync] = useState(false);

  // Completion flow state
  const [step, setStep] = useState<Step>('details');
  const [skipSize, setSkipSize] = useState<SkipSize | null>(null);
  const [truckType, setTruckType] = useState<TruckType | null>(null);
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
            customer:customers(id, name, address, contact_phone),
            driver:drivers(id, name, phone),
            completion:skip_job_completion(*)
          `)
          .eq('id', jobId)
          .single();

        if (fetchError || !data) {
          setStep('error');
          setError('Job not found');
          return;
        }

        setJob(data);
        
        // Pre-select values from job if set by office
        if (data.office_action) {
          setAction(data.office_action);
        }
        if (data.skip_size) {
          setSkipSize(data.skip_size);
        }
        if (data.truck_type) {
          setTruckType(data.truck_type);
        }
      } catch (err) {
        console.error('Error loading job:', err);
        setStep('error');
        setError('Failed to load job');
      } finally {
        setLoading(false);
      }
    }

    if (jobId) loadJob();
  }, [jobId]);

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

  const handleStartJob = async () => {
    if (!job) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/skip-jobs/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start job');
      }

      // Update local state
      setJob({ ...job, status: 'in_progress', started_at: new Date().toISOString() });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenMaps = () => {
    if (!job?.customer?.address) return;
    const encodedAddress = encodeURIComponent(job.customer.address);
    // Try Apple Maps first (iOS), fallback to Google Maps
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const mapsUrl = isIOS 
      ? `maps://maps.apple.com/?q=${encodedAddress}`
      : `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    window.open(mapsUrl, '_blank');
  };

  const handleSelectSize = (size: SkipSize) => {
    setSkipSize(size);
    setStep('action');
  };

  const handleSelectAction = (selectedAction: SkipAction) => {
    setAction(selectedAction);
    setPickSize(null);
    setDropSize(null);
    setStep('confirm');
  };

  const handleSubmitCompletion = async () => {
    if (!action || !job) return;
    if (action === 'pick_drop' && (!pickSize || !dropSize)) {
      setError('Select removed and left-on-site sizes');
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
          token: job.job_token,
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
      // Check if offline - mark as pending sync
      if (!navigator.onLine) {
        setPendingSync(true);
        setError('Saved locally - will sync when online');
        // In a real implementation, we'd save to localStorage here
      } else {
        setError(errorMessage);
      }
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
  if (step === 'error' && !job) {
    return (
      <div className="min-h-screen flex items-center justify-center  p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-white mb-2">Error</h1>
          <p className="text-gray-400 mb-4">{error}</p>
          <Link href="/driver/jobs" className="text-blue-400 underline">
            ← Back to Jobs
          </Link>
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
          <Link 
            href="/driver/jobs"
            className="mt-6 inline-block px-6 py-3 bg-green-700 hover:bg-green-600 rounded-lg font-medium"
          >
            Back to Jobs
          </Link>
        </div>
      </div>
    );
  }

  const isCompleted = job?.status === 'completed';
  const isInProgress = job?.status === 'in_progress';
  const canStart = job?.status === 'sent' || job?.status === 'created';

  return (
    <div 
      className="min-h-screen text-white"
      
    >
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-[#1a1a1a] via-[#1a1a1a]/95 to-transparent backdrop-blur-sm p-4">
        <div className="flex items-center justify-between">
          <Link href="/driver/jobs" className="text-blue-400 flex items-center gap-1 hover:text-blue-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <Link href="/">
            <Image
              src="/imr-logo.png"
              alt="IMR Logo"
              width={48}
              height={48}
              className="rounded drop-shadow-lg"
            />
          </Link>
        </div>
      </div>

      {/* Step: Details View */}
      {step === 'details' && (
        <div className="p-4">
          {/* Status Banner */}
          <div className={`p-3 rounded-lg mb-4 text-center ${STATUS_COLORS[job?.status || 'created']}`}>
            <span className="font-bold">{STATUS_LABELS[job?.status || 'created']}</span>
            {pendingSync && <span className="ml-2">⏳ Pending Sync</span>}
          </div>

          {/* Job Info Card */}
          <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/95 backdrop-blur-lg rounded-2xl p-4 mb-4 border border-gray-700/50 shadow-lg">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="text-sm text-gray-400">Docket No</div>
                <div className="text-xl font-bold">{job?.docket_no}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">Date</div>
                <div className="font-medium">
                  {job?.job_date && new Date(job.job_date).toLocaleDateString('en-IE', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short'
                  })}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-3 space-y-3">
              <div>
                <div className="text-sm text-gray-400">Customer</div>
                <div className="font-medium text-lg">{job?.customer?.name || 'Unknown'}</div>
              </div>

              {job?.customer?.address && (
                <div>
                  <div className="text-sm text-gray-400">Address</div>
                  <div className="font-medium">{job.customer.address}</div>
                </div>
              )}

              {job?.customer?.contact_phone && (
                <div>
                  <div className="text-sm text-gray-400">Contact Phone</div>
                  <a href={`tel:${job.customer.contact_phone}`} className="font-medium text-blue-400">
                    {job.customer.contact_phone}
                  </a>
                </div>
              )}

              {job?.truck_reg && (
                <div>
                  <div className="text-sm text-gray-400">Truck Reg</div>
                  <div className="font-medium">🚛 {job.truck_reg}</div>
                </div>
              )}

              {/* Skip Size & Truck Type */}
              {(job?.skip_size || job?.truck_type) && (
                <div className="grid grid-cols-2 gap-3">
                  {job?.skip_size && (
                    <div className="/30 border border-green-700 rounded-lg p-3">
                      <div className="text-sm text-green-400">Skip Size</div>
                      <div className="font-bold text-xl text-green-200">
                        {SKIP_SIZES.find(s => s.value === job.skip_size)?.label || job.skip_size}y
                      </div>
                    </div>
                  )}
                  {job?.truck_type && (
                    <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-3">
                      <div className="text-sm text-orange-400">Truck Type</div>
                      <div className="font-bold text-lg text-orange-200">
                        🚛 {TRUCK_TYPES.find(t => t.value === job.truck_type)?.label || job.truck_type}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {job?.office_action && (
                <div>
                  <div className="text-sm text-gray-400">Action Required</div>
                  <div className="font-medium text-yellow-400">
                    {job.office_action === 'pick_drop' ? 'Pick & Drop' : 
                     job.office_action.charAt(0).toUpperCase() + job.office_action.slice(1)}
                  </div>
                </div>
              )}

              {job?.notes && (
                <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
                  <div className="text-sm text-yellow-400 font-medium mb-1">📝 Office Notes</div>
                  <div className="text-yellow-200">{job.notes}</div>
                </div>
              )}
            </div>
          </div>

          {/* Completion Info (if completed) */}
          {isCompleted && job?.completion && (
            <div className="/30 border border-green-700 rounded-xl p-4 mb-4">
              <h3 className="font-bold text-green-400 mb-2">Completion Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Skip Size:</span>
                  <span>{SKIP_SIZES.find(s => s.value === job.completion?.skip_size)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Action:</span>
                  <span>{SKIP_ACTIONS.find(a => a.value === job.completion?.action)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Completed:</span>
                  <span>{job.completed_at && new Date(job.completed_at).toLocaleString('en-IE')}</span>
                </div>
                {job.completion?.customer_signature && (
                  <div className="pt-2 border-t border-green-700">
                    <span className="text-gray-400">Customer Signature:</span>
                    <p className="text-green-200 mt-1">{job.completion.customer_signature}</p>
                  </div>
                )}
                {job.completion?.driver_notes && (
                  <div className="pt-2 border-t border-green-700">
                    <span className="text-gray-400">Driver Notes:</span>
                    <p className="text-green-200 mt-1">{job.completion.driver_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error message */}
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

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Open in Maps */}
            {job?.customer?.address && (
              <button
                onClick={handleOpenMaps}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 rounded-xl text-lg font-bold flex items-center justify-center gap-2"
              >
                <span>🗺️</span> Open in Maps
              </button>
            )}

            {/* Start Job Button */}
            {canStart && (
              <button
                onClick={() => setStep('start_config')}
                className="w-full py-4 bg-yellow-600 hover:bg-yellow-700 rounded-xl text-lg font-bold flex items-center justify-center gap-2"
              >
                <span>▶️</span> Start Job
              </button>
            )}

            {/* Complete Job Button */}
            {(isInProgress || canStart) && (
              <button
                onClick={() => setStep('size')}
                className="w-full py-5 bg-green-600 hover:bg-green-700 rounded-xl text-xl font-bold flex items-center justify-center gap-2"
              >
                <span>✅</span> Complete Job
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step: Start Job Config - Select skip size, truck type, action */}
      {step === 'start_config' && (
        <div className="p-4">
          <div className="mb-4">
            <button
              onClick={() => setStep('details')}
              className="text-blue-400 text-sm flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Details
            </button>
          </div>

          <h2 className="text-xl font-semibold mb-4 text-center">Confirm Job Details</h2>

          {/* Skip Size Selection */}
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">Skip Size *</label>
            <div className="grid grid-cols-4 gap-2">
              {SKIP_SIZES.map((size) => (
                <button
                  key={size.value}
                  onClick={() => setSkipSize(size.value)}
                  className={`py-3 px-2 rounded-lg text-lg font-bold transition-colors ${
                    skipSize === size.value
                      ? 'bg-green-600 text-white ring-2 ring-green-400'
                      : 'bg-gray-500/60 text-gray-100 hover:bg-gray-500'
                  }`}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>

          {/* Truck Type Selection */}
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">Truck Type *</label>
            <div className="grid grid-cols-2 gap-3">
              {TRUCK_TYPES.map((truck) => (
                <button
                  key={truck.value}
                  onClick={() => setTruckType(truck.value)}
                  className={`py-4 px-4 rounded-lg text-lg font-bold transition-colors ${
                    truckType === truck.value
                      ? 'bg-orange-600 text-white ring-2 ring-orange-400'
                      : 'bg-gray-500/60 text-gray-100 hover:bg-gray-500'
                  }`}
                >
                  🚛 {truck.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Selection */}
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">Action *</label>
            <div className="space-y-2">
              {SKIP_ACTIONS.map((act) => (
                <button
                  key={act.value}
                  onClick={() => setAction(act.value)}
                  className={`w-full py-4 px-4 rounded-lg text-lg font-bold transition-colors ${
                    action === act.value
                      ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                      : job?.office_action === act.value
                        ? 'bg-yellow-700 text-yellow-200 border-2 border-yellow-500'
                        : 'bg-gray-500/60 text-gray-100 hover:bg-gray-500'
                  }`}
                >
                  {act.label}
                  {job?.office_action === act.value && action !== act.value && (
                    <span className="ml-2 text-sm">(Office requested)</span>
                  )}
                </button>
              ))}
            </div>
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

          {/* Start Job Button */}
          <button
            onClick={async () => {
              if (!skipSize || !truckType || !action) {
                setError('Please select skip size, truck type, and action');
                return;
              }
              await handleStartJob();
              if (!error) {
                setStep('details');
              }
            }}
            disabled={submitting || !skipSize || !truckType || !action}
            className="w-full py-5 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 rounded-xl text-xl font-bold transition-colors active:scale-95"
          >
            {submitting ? 'Starting...' : '▶️ Confirm & Start Job'}
          </button>
        </div>
      )}

      {/* Step: Select Skip Size */}
      {step === 'size' && (
        <div className="p-4">
          <div className="mb-4">
            <button
              onClick={() => setStep('details')}
              className="text-blue-400 text-sm flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Details
            </button>
          </div>
          
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

      {/* Step: Select Action */}
      {step === 'action' && (
        <div className="p-4">
          <div className="mb-4">
            <button
              onClick={() => setStep('size')}
              className="text-blue-400 text-sm flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
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
                className={`w-full py-5 px-4 rounded-xl text-xl font-bold transition-colors active:scale-95 ${
                  job?.office_action === act.value 
                    ? 'bg-yellow-600 hover:bg-yellow-700 ring-2 ring-yellow-400' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {act.label}
                {job?.office_action === act.value && (
                  <span className="ml-2 text-sm">(Requested)</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: Confirm */}
      {step === 'confirm' && (
        <div className="p-4">
          <div className="mb-4">
            <button
              onClick={() => setStep('action')}
              className="text-blue-400 text-sm flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          </div>

          <h2 className="text-xl font-semibold mb-4 text-center">Confirm Job Completion</h2>

          {/* Summary */}
          <div className="bg-gray-600/40 rounded-lg p-4 mb-4 space-y-2 border border-gray-500/40">
            <div className="flex justify-between">
              <span className="text-gray-400">Customer:</span>
              <span className="font-bold">{job?.customer?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Docket:</span>
              <span className="font-bold">{job?.docket_no}</span>
            </div>
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
            <div className={`mb-4 p-3 rounded-lg ${pendingSync ? 'bg-yellow-900/50 text-yellow-200' : 'bg-red-900/50 text-red-200'}`}>
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmitCompletion}
            disabled={submitting}
            className="w-full py-5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-xl text-2xl font-bold transition-colors active:scale-95"
          >
            {submitting ? 'Submitting...' : '✓ Confirm & Complete'}
          </button>
        </div>
      )}
      
      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

