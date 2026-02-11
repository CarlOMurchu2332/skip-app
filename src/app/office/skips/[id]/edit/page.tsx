'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Customer, Driver, SkipAction, SkipSize, TruckType, SkipJob, SKIP_ACTIONS, SKIP_SIZES, TRUCK_TYPES } from '@/lib/types';

export default function EditSkipJobPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  
  const [job, setJob] = useState<SkipJob | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [driverId, setDriverId] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [jobDate, setJobDate] = useState('');
  const [notes, setNotes] = useState('');
  const [officeAction, setOfficeAction] = useState<SkipAction | ''>('');
  const [skipSize, setSkipSize] = useState<SkipSize | ''>('');
  const [truckType, setTruckType] = useState<TruckType | ''>('');
  
  // Customer search
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const customersPromise = supabase.from('customers').select('*').order('name');
        const driversPromise = supabase.from('drivers').select('*').eq('is_active', true).order('name');
        const jobPromise = supabase.from('skip_jobs').select(`
            *,
            customer:customers(*),
            driver:drivers(*)
          `).eq('id', jobId).single();

        const [customersRes, driversRes, jobRes] = await Promise.all([
          customersPromise,
          driversPromise,
          jobPromise,
        ]);

        if (customersRes.data) setCustomers(customersRes.data as Customer[]);
        if (driversRes.data) setDrivers(driversRes.data as Driver[]);
        
        if (jobRes.data) {
          const j = jobRes.data as SkipJob;
          setJob(j);
          
          // Populate form with existing values
          if (j.customer_id) {
            setCustomerId(j.customer_id);
            setSelectedCustomer(j.customer || null);
            setCustomerSearch(j.customer?.name || '');
          }
          if (j.driver_id) {
            setDriverId(j.driver_id);
            setSelectedDriver(j.driver || null);
          }
          setJobDate(j.job_date || '');
          setNotes(j.notes || '');
          setOfficeAction(j.office_action || '');
          setSkipSize((j.skip_size as SkipSize) || '');
          setTruckType((j.truck_type as TruckType) || '');
        } else {
          setError('Job not found');
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load job');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [jobId]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.address && c.address.toLowerCase().includes(customerSearch.toLowerCase()))
  );

  const selectCustomer = (customer: Customer) => {
    setCustomerId(customer.id);
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
  };

  const clearCustomer = () => {
    setCustomerId('');
    setSelectedCustomer(null);
    setCustomerSearch('');
  };

  const selectDriver = (driver: Driver) => {
    setDriverId(driver.id);
    setSelectedDriver(driver);
  };

  const isFormValid = customerId && driverId && jobDate;

  const handleSubmit = async () => {
    if (!isFormValid) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/skip-jobs/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          customer_id: customerId,
          driver_id: driverId,
          job_date: jobDate,
          notes: notes || null,
          office_action: officeAction || null,
          skip_size: skipSize || null,
          truck_type: truckType || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update job');
      }

      setSuccessToast('Job updated successfully!');
      setTimeout(() => router.push('/office/skips'), 1500);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading job...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Job not found'}</p>
          <a href="/office/skips" className="text-blue-600 hover:underline">← Back to Jobs</a>
        </div>
      </div>
    );
  }

  if (job.status === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-orange-500 mb-4">Cannot edit completed jobs</p>
          <a href="/office/skips" className="text-blue-600 hover:underline">← Back to Jobs</a>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen py-8"
      style={{
        background: `
          linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 25%, #1f1f1f 50%, #2a2a2a 75%, #1a1a1a 100%),
          repeating-linear-gradient(60deg, transparent, transparent 10px, rgba(255,255,255,0.02) 10px, rgba(255,255,255,0.02) 20px),
          repeating-linear-gradient(120deg, transparent, transparent 10px, rgba(255,255,255,0.015) 10px, rgba(255,255,255,0.015) 20px)
        `,
        backgroundBlendMode: 'overlay',
      }}
    >
      {/* Success Toast */}
      {successToast && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse">
          {successToast}
        </div>
      )}

      {/* Sticky Logo */}
      <div className="sticky top-0 z-40 py-4 bg-gradient-to-b from-[#1a1a1a] via-[#1a1a1a]/90 to-transparent">
        <div className="flex justify-center">
          <a href="/">
            <img 
              src="/imr-logo.png" 
              alt="Irish Metals Recycling" 
              className="h-32 w-auto drop-shadow-2xl"
            />
          </a>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-8">
        <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/95 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-gray-700/50">
          <div className="flex justify-between items-start mb-2">
            <h1 className="text-2xl font-bold text-white">Edit Skip Job</h1>
            <span className="px-3 py-1 bg-orange-600/50 text-orange-300 rounded-full text-sm font-medium border border-orange-500/30">
              Editing
            </span>
          </div>
          
          <p className="text-sm text-blue-400 font-mono mb-6">
            Docket No: {job.docket_no}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-5">
            {/* Customer Searchable Combobox */}
            <div ref={customerDropdownRef} className="relative">
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Company / Customer *
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type to search customers..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                    if (selectedCustomer && e.target.value !== selectedCustomer.name) {
                      clearCustomer();
                    }
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="w-full px-3 py-2.5 bg-gray-500/40 border border-gray-400/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {selectedCustomer && (
                  <button
                    type="button"
                    onClick={clearCustomer}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
              
              {showCustomerDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectCustomer(c)}
                      className={`w-full text-left px-3 py-2 hover:bg-blue-50 ${
                        customerId === c.id ? 'bg-blue-100' : ''
                      }`}
                    >
                      <div className="font-medium">{c.name}</div>
                      {c.address && <div className="text-sm text-gray-500">{c.address}</div>}
                    </button>
                  ))}
                </div>
              )}
              
              {selectedCustomer && (
                <div className="mt-2 p-2.5 bg-gray-600/30 rounded-lg text-sm text-gray-200 border border-gray-600/30">
                  {selectedCustomer.address && <div>📍 {selectedCustomer.address}</div>}
                  {selectedCustomer.contact_name && <div>👤 {selectedCustomer.contact_name}</div>}
                  {selectedCustomer.contact_phone && <div>📞 {selectedCustomer.contact_phone}</div>}
                </div>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={jobDate}
                onChange={(e) => setJobDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-500/40 border border-gray-400/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Job Type (Office Action) */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Collection Type
              </label>
              <div className="flex gap-2">
                {SKIP_ACTIONS.map((action) => (
                  <button
                    key={action.value}
                    type="button"
                    onClick={() => setOfficeAction(officeAction === action.value ? '' : action.value)}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      officeAction === action.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-600/50 text-gray-200 hover:bg-gray-600 border border-gray-500/30'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Skip Size */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Skip Size
              </label>
              <div className="flex flex-wrap gap-2">
                {SKIP_SIZES.map((size) => (
                  <button
                    key={size.value}
                    type="button"
                    onClick={() => setSkipSize(skipSize === size.value ? '' : size.value)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      skipSize === size.value
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-600/50 text-gray-200 hover:bg-gray-600 border border-gray-500/30'
                    }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Truck Type */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Truck Type
              </label>
              <div className="flex gap-2">
                {TRUCK_TYPES.map((truck) => (
                  <button
                    key={truck.value}
                    type="button"
                    onClick={() => setTruckType(truckType === truck.value ? '' : truck.value)}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      truckType === truck.value
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-600/50 text-gray-200 hover:bg-gray-600 border border-gray-500/30'
                    }`}
                  >
                    🚛 {truck.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Driver Select */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Driver *
              </label>
              <select
                value={driverId}
                onChange={(e) => {
                  const driver = drivers.find(d => d.id === e.target.value);
                  if (driver) selectDriver(driver);
                }}
                className="w-full px-3 py-2.5 bg-gray-500/40 border border-gray-400/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a driver</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {!d.phone && '(No phone)'}
                  </option>
                ))}
              </select>
              {selectedDriver && selectedDriver.phone && (
                <p className="mt-1 text-sm text-green-400">📱 {selectedDriver.phone}</p>
              )}
            </div>


            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Notes for driver (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 bg-gray-500/40 border border-gray-400/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Gate code, access instructions, contact on site..."
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <a
                href="/office/skips"
                className="flex-1 px-4 py-3 bg-gray-600/50 text-gray-200 rounded-lg font-medium hover:bg-gray-600 border border-gray-500/30 text-center"
              >
                Cancel
              </a>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !isFormValid}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg font-medium hover:from-orange-700 hover:to-orange-800 disabled:opacity-50 shadow-lg transition-all"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <a href="/office/skips" className="text-blue-400 hover:text-blue-300 hover:underline">
            ← Back to Jobs List
          </a>
        </div>
      </div>
    </div>
  );
}
