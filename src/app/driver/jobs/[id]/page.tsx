'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { SkipJob, SkipSize, SkipAction, TruckType, SKIP_SIZES, SKIP_ACTIONS, STATUS_COLORS, STATUS_LABELS, TRUCK_TYPES } from '@/lib/types';
import BottomNav from '@/components/BottomNav';
import Celebration from '@/components/Celebration';

type Step = 'details' | 'complete' | 'success' | 'error';

export default function DriverJobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;

  const [job, setJob] = useState<SkipJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Completion flow state
  const [step, setStep] = useState<Step>('details');
  const [skipSize, setSkipSize] = useState<SkipSize | null>(null);
  const [truckType, setTruckType] = useState<TruckType | null>(null);
  const [action, setAction] = useState<SkipAction | null>(null);
  const [pickSize, setPickSize] = useState<SkipSize | null>(null);
  const [dropSize, setDropSize] = useState<SkipSize | null>(null);
  const [truckReg, setTruckReg] = useState('');
  const [customerSignature, setCustomerSignature] = useState('');

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

        const jobData = data as SkipJob;
        setJob(jobData);
        
        // Pre-select values from job if set by office
        if (jobData.office_action) {
          setAction(jobData.office_action);
        }
        if (jobData.skip_size) {
          setSkipSize(jobData.skip_size);
        }
        if (jobData.truck_type) {
          setTruckType(jobData.truck_type);
        }
        // Pre-fill truck reg if available
        if (jobData.truck_reg) {
          setTruckReg(jobData.truck_reg);
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

  // Success state - Show celebration!
  if (step === 'success') {
    return <Celebration />;
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

            {/* Start Job Button (for new jobs) */}
            {canStart && (
              <button
                onClick={() => setStep('complete')}
                className="w-full py-5 bg-yellow-600 hover:bg-yellow-700 rounded-xl text-xl font-bold flex items-center justify-center gap-2"
              >
                <span>▶️</span> Start Job
              </button>
            )}

            {/* Complete Job Button (for in-progress jobs) */}
            {isInProgress && (
              <button
                onClick={async () => {
                  if (!customerSignature.trim()) {
                    setError('Please enter customer signature name');
                    return;
                  }

                  setSubmitting(true);
                  setError('');

                  try {
                    // Get GPS location
                    let lat: number | null = null;
                    let lng: number | null = null;
                    let accuracy_m: number | null = null;

                    if (navigator.geolocation) {
                      try {
                        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                          navigator.geolocation.getCurrentPosition(resolve, reject, {
                            enableHighAccuracy: true,
                            timeout: 10000,
                            maximumAge: 0
                          });
                        });
                        lat = position.coords.latitude;
                        lng = position.coords.longitude;
                        accuracy_m = position.coords.accuracy;
                      } catch (geoError) {
                        console.warn('GPS not available:', geoError);
                      }
                    }

                    // Call complete API with pick/drop sizes from job
                    const res = await fetch('/api/skip-jobs/complete', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        token: job?.job_token,
                        skip_size: job?.skip_size,
                        action: job?.office_action,
                        pick_size: (job as any)?.pick_size || null,
                        drop_size: (job as any)?.drop_size || null,
                        customer_signature: customerSignature.trim(),
                        lat,
                        lng,
                        accuracy_m,
                        driver_notes: ''
                      }),
                    });

                    const data = await res.json();

                    if (!res.ok) {
                      throw new Error(data.error || 'Failed to complete job');
                    }

                    // Success! Show celebration
                    setStep('success');
                  } catch (err: unknown) {
                    const errorMessage = err instanceof Error ? err.message : 'An error occurred';
                    setError(errorMessage);
                    setSubmitting(false);
                  }
                }}
                disabled={submitting || !customerSignature.trim()}
                className="w-full py-5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-xl text-xl font-bold flex items-center justify-center gap-2"
              >
                {submitting ? 'Completing...' : <><span>✅</span> Complete Job</>}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step: Complete - Unified job completion on one page */}
      {step === 'complete' && (
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
                  onClick={() => {
                    setAction(act.value);
                    // Reset pick/drop sizes when action changes
                    setPickSize(null);
                    setDropSize(null);
                  }}
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

          {/* Pick Size (for pick or pick_drop actions) */}
          {(action === 'pick' || action === 'pick_drop') && (
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">
                {action === 'pick_drop' ? 'Removed Skip Size *' : 'Pick Up Skip Size *'}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {SKIP_SIZES.map((size) => (
                  <button
                    key={size.value}
                    onClick={() => setPickSize(size.value)}
                    className={`py-3 px-2 rounded-lg text-lg font-bold transition-colors ${
                      pickSize === size.value
                        ? 'bg-red-600 text-white ring-2 ring-red-400'
                        : 'bg-gray-500/60 text-gray-100 hover:bg-gray-500'
                    }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Drop Size (for drop or pick_drop actions) */}
          {(action === 'drop' || action === 'pick_drop') && (
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">
                {action === 'pick_drop' ? 'Left on Site Skip Size *' : 'Drop Off Skip Size *'}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {SKIP_SIZES.map((size) => (
                  <button
                    key={size.value}
                    onClick={() => setDropSize(size.value)}
                    className={`py-3 px-2 rounded-lg text-lg font-bold transition-colors ${
                      dropSize === size.value
                        ? 'bg-green-600 text-white ring-2 ring-green-400'
                        : 'bg-gray-500/60 text-gray-100 hover:bg-gray-500'
                    }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Truck Reg Input - Mandatory */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">
              Truck Registration * (Required)
            </label>
            <input
              value={truckReg}
              onChange={(e) => setTruckReg(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 bg-gray-500/40 border border-gray-500/50 rounded-lg text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 242-MH-1572"
              maxLength={20}
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

          {/* Start Job Button */}
          <button
            onClick={async () => {
              // Validation
              if (!skipSize || !truckType || !action || !truckReg.trim()) {
                setError('Please fill in all required fields: skip size, truck type, action, and truck reg');
                return;
              }

              // Validate pick/drop sizes based on action
              if (action === 'pick' && !pickSize) {
                setError('Please select the skip size to pick up');
                return;
              }
              if (action === 'drop' && !dropSize) {
                setError('Please select the skip size to drop off');
                return;
              }
              if (action === 'pick_drop' && (!pickSize || !dropSize)) {
                setError('Please select both removed skip size and left on site skip size');
                return;
              }
              
              setSubmitting(true);
              setError('');
              
              try {
                // First update the job with ALL selected values including truck reg and pick/drop sizes
                const { error: updateError } = await supabase
                  .from('skip_jobs')
                  .update({
                    skip_size: skipSize,
                    truck_type: truckType,
                    office_action: action,
                    truck_reg: truckReg.trim(),
                    pick_size: pickSize,
                    drop_size: dropSize
                  })
                  .eq('id', job!.id);

                if (updateError) throw new Error('Failed to update job details');

                // Only call start if job is not already in progress
                if (job!.status !== 'in_progress') {
                  await handleStartJob();
                }
                
                // Success - refresh job data and go back to details
                setJob(prev => prev ? { 
                  ...prev, 
                  truck_reg: truckReg.trim(),
                  skip_size: skipSize,
                  truck_type: truckType,
                  office_action: action,
                  status: 'in_progress'
                } : null);
                setSubmitting(false);
                setStep('details');
              } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'An error occurred';
                setError(errorMessage);
                setSubmitting(false);
              }
            }}
            disabled={submitting || !skipSize || !truckType || !action || !truckReg.trim()}
            className="w-full py-5 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 rounded-xl text-xl font-bold transition-colors active:scale-95"
          >
            {submitting ? (job?.status === 'in_progress' ? 'Saving...' : 'Starting...') : (job?.status === 'in_progress' ? '✅ Save & Continue' : '▶️ Confirm & Start Job')}
          </button>
        </div>
      )}

      
      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}


