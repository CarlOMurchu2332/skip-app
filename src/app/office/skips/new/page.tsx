'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Customer, Driver, SkipAction, SkipSize, TruckType, SKIP_ACTIONS, SKIP_SIZES, TRUCK_TYPES } from '@/lib/types';

export default function NewSkipJobPage() {
  const router = useRouter();
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
  const [truckReg, setTruckReg] = useState('');
  const [jobDate, setJobDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [officeAction, setOfficeAction] = useState<SkipAction | ''>('');
  const [skipSize, setSkipSize] = useState<SkipSize | ''>('');
  const [truckType, setTruckType] = useState<TruckType | ''>('');
  
  // Customer search
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  
  // Customer modal
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    address: '',
    contact_name: '',
    contact_phone: '',
    notes: '',
  });
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Docket number preview
  const [docketPreview, setDocketPreview] = useState('');

  // Driver modal
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [newDriver, setNewDriver] = useState({
    name: '',
    phone: '',
  });
  const [savingDriver, setSavingDriver] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [customersRes, driversRes] = await Promise.all([
          supabase.from('customers').select('*').order('name'),
          supabase.from('drivers').select('*').eq('is_active', true).order('name'),
        ]);

        if (customersRes.data) setCustomers(customersRes.data);
        if (driversRes.data) setDrivers(driversRes.data);
        
        // Generate docket preview
        const today = new Date();
        const datePart = today.toISOString().slice(2, 10).replace(/-/g, '').slice(0, 6);
        setDocketPreview(`${datePart}-XXXX-IMR`);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Update docket preview when date changes
  useEffect(() => {
    if (jobDate) {
      const d = new Date(jobDate);
      const yy = String(d.getFullYear()).slice(2);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setDocketPreview(`${yy}${mm}${dd}-XXXX-IMR`);
    }
  }, [jobDate]);

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

  const setDateToday = () => setJobDate(new Date().toISOString().split('T')[0]);
  const setDateTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setJobDate(tomorrow.toISOString().split('T')[0]);
  };

  const normalizeTruckReg = (value: string) => {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  };

  const formatTruckRegDisplay = (value: string) => {
    // Remove all non-alphanumeric
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Irish format: max 3 digits, then max 2 letters, then max 8 digits
    // e.g. 242-MH-12345678
    let digits1 = '';
    let letters = '';
    let digits2 = '';
    let pos = 0;
    
    // Extract first part: up to 3 digits
    while (pos < clean.length && digits1.length < 3 && /[0-9]/.test(clean[pos])) {
      digits1 += clean[pos];
      pos++;
    }
    
    // Extract middle part: up to 2 letters
    while (pos < clean.length && letters.length < 2 && /[A-Z]/.test(clean[pos])) {
      letters += clean[pos];
      pos++;
    }
    
    // Extract last part: up to 8 digits
    while (pos < clean.length && digits2.length < 8 && /[0-9]/.test(clean[pos])) {
      digits2 += clean[pos];
      pos++;
    }
    
    // Build formatted string
    let result = digits1;
    if (letters) result += '-' + letters;
    if (digits2) result += '-' + digits2;
    
    return result;
  };

  const handleSaveNewCustomer = async () => {
    if (!newCustomer.name.trim()) {
      alert('Customer name is required');
      return;
    }

    setSavingCustomer(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          name: newCustomer.name.trim(),
          address: newCustomer.address.trim() || null,
          contact_name: newCustomer.contact_name.trim() || null,
          contact_phone: newCustomer.contact_phone.trim() || null,
          notes: newCustomer.notes.trim() || null,
        }])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setCustomers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        selectCustomer(data);
        setShowCustomerModal(false);
        setNewCustomer({ name: '', address: '', contact_name: '', contact_phone: '', notes: '' });
      }
    } catch (err) {
      console.error('Error saving customer:', err);
      alert('Failed to save customer');
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleSaveNewDriver = async () => {
    if (!newDriver.name.trim()) {
      alert('Driver name is required');
      return;
    }
    if (!newDriver.phone.trim()) {
      alert('Phone number is required for SMS');
      return;
    }

    setSavingDriver(true);
    try {
      // Format phone number for Ireland
      let phone = newDriver.phone.trim();
      if (phone.startsWith('08')) {
        phone = '+353' + phone.slice(1);
      } else if (!phone.startsWith('+')) {
        phone = '+353' + phone;
      }

      const { data, error } = await supabase
        .from('drivers')
        .insert([{
          name: newDriver.name.trim(),
          phone,
          is_active: true,
        }])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setDrivers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        selectDriver(data);
        setShowDriverModal(false);
        setNewDriver({ name: '', phone: '' });
      }
    } catch (err) {
      console.error('Error saving driver:', err);
      alert('Failed to save driver');
    } finally {
      setSavingDriver(false);
    }
  };

  const isFormValid = customerId && driverId && truckReg && jobDate;
  const driverHasPhone = selectedDriver?.phone;

  const handleSubmit = async (sendToDriver: boolean) => {
    if (!isFormValid) {
      setError('Please fill in all required fields');
      return;
    }

    if (sendToDriver && !driverHasPhone) {
      setError('Selected driver has no phone number on file');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Create job
      const createRes = await fetch('/api/skip-jobs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          driver_id: driverId,
          truck_reg: normalizeTruckReg(truckReg),
          job_date: jobDate,
          notes,
          office_action: officeAction || null,
          skip_size: skipSize || null,
          truck_type: truckType || null,
        }),
      });

      const createData = await createRes.json();

      if (!createRes.ok) {
        throw new Error(createData.error || 'Failed to create job');
      }

      // If sending to driver, call send endpoint
      if (sendToDriver) {
        const sendRes = await fetch('/api/skip-jobs/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_id: createData.job.id }),
        });

        const sendData = await sendRes.json();

        if (!sendRes.ok) {
          throw new Error(sendData.error || 'Failed to send to driver');
        }

        setSuccessToast(`Sent to ${selectedDriver?.name} (SMS). Status: Sent ✅`);
        setTimeout(() => router.push('/office/skips'), 2000);
      } else {
        setSuccessToast('Job saved as draft!');
        setTimeout(() => router.push('/office/skips'), 1500);
      }
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
        <div className="text-lg">Loading...</div>
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
            <h1 className="text-2xl font-bold text-white">Create Skip Job</h1>
            <span className="px-3 py-1 bg-gray-600/50 text-gray-300 rounded-full text-sm font-medium border border-gray-500/30">
              Draft
            </span>
          </div>
          
          {/* Docket Preview */}
          <p className="text-sm text-blue-400 font-mono mb-6">
            Docket No: {docketPreview} <span className="text-gray-500">(generated on save)</span>
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-5">
            {/* Customer Searchable Combobox */}
            <div ref={customerDropdownRef} className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-1">
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
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomerDropdown(false);
                      setShowCustomerModal(true);
                    }}
                    className="w-full text-left px-3 py-2 text-blue-600 font-medium hover:bg-blue-50 border-t"
                  >
                    + Add new customer
                  </button>
                </div>
              )}
              
              {/* Selected customer details */}
              {selectedCustomer && (
                <div className="mt-2 p-2.5 bg-gray-700/30 rounded-lg text-sm text-gray-300 border border-gray-600/30">
                  {selectedCustomer.address && <div>📍 {selectedCustomer.address}</div>}
                  {selectedCustomer.contact_name && <div>👤 {selectedCustomer.contact_name}</div>}
                  {selectedCustomer.contact_phone && <div>📞 {selectedCustomer.contact_phone}</div>}
                </div>
              )}
            </div>

            {/* Date with quick buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Date *
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={jobDate}
                  onChange={(e) => setJobDate(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-gray-500/40 border border-gray-400/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={setDateToday}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    jobDate === new Date().toISOString().split('T')[0]
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-600/50 text-gray-300 hover:bg-gray-600 border border-gray-500/30'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={setDateTomorrow}
                  className="px-4 py-2 bg-gray-600/50 text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-600 border border-gray-500/30"
                >
                  Tomorrow
                </button>
              </div>
            </div>

            {/* Job Type (Office Action) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
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
                        : 'bg-gray-600/50 text-gray-300 hover:bg-gray-600 border border-gray-500/30'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Skip Size */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
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
                        : 'bg-gray-600/50 text-gray-300 hover:bg-gray-600 border border-gray-500/30'
                    }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Truck Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
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
                        : 'bg-gray-600/50 text-gray-300 hover:bg-gray-600 border border-gray-500/30'
                    }`}
                  >
                    🚛 {truck.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Driver Select with Add option */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Driver *
              </label>
              <div className="flex gap-2">
                <select
                  value={driverId}
                  onChange={(e) => {
                    const driver = drivers.find(d => d.id === e.target.value);
                    if (driver) selectDriver(driver);
                  }}
                  className="flex-1 px-3 py-2.5 bg-gray-500/40 border border-gray-400/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a driver</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {!d.phone && '(No phone)'}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowDriverModal(true)}
                  className="px-4 py-2 bg-blue-600/30 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-600/50 border border-blue-500/30"
                >
                  + Add
                </button>
              </div>
              {selectedDriver && !selectedDriver.phone && (
                <p className="mt-1 text-sm text-orange-400">⚠️ This driver has no phone number on file</p>
              )}
              {selectedDriver && selectedDriver.phone && (
                <p className="mt-1 text-sm text-green-400">📱 {selectedDriver.phone}</p>
              )}
            </div>

            {/* Truck Reg */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Truck Reg *
              </label>
              <input
                type="text"
                value={truckReg}
                onChange={(e) => setTruckReg(formatTruckRegDisplay(e.target.value))}
                placeholder="e.g. 242-MH-1572"
                className="w-full px-3 py-2.5 bg-gray-500/40 border border-gray-400/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
              />
              <p className="mt-1 text-xs text-gray-500">Format: 242-MH-1572 or 242 MH 1572</p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
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
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={submitting || !isFormValid}
                className="flex-1 px-4 py-3 bg-gray-600/50 text-gray-300 rounded-lg font-medium hover:bg-gray-600 border border-gray-500/30 disabled:opacity-50 transition-colors"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={submitting || !isFormValid || !driverHasPhone}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 shadow-lg transition-all"
              >
                {submitting ? 'Sending...' : 'Send to Driver (SMS)'}
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Sends link to driver phone number on file.
            </p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <a href="/office/skips" className="text-blue-400 hover:text-blue-300 hover:underline">
            ← Back to Jobs List
          </a>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Add New Customer</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Company or site name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address / Eircode
                </label>
                <input
                  type="text"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Full address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site Contact Name
                </label>
                <input
                  type="text"
                  value={newCustomer.contact_name}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, contact_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Person to contact on site"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site Contact Phone
                </label>
                <input
                  type="tel"
                  value={newCustomer.contact_phone}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, contact_phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+353..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (gate codes, access info, etc.)
                </label>
                <textarea
                  value={newCustomer.notes}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowCustomerModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md font-medium hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewCustomer}
                disabled={savingCustomer || !newCustomer.name.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {savingCustomer ? 'Saving...' : 'Save Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Driver Modal */}
      {showDriverModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Add New Driver</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Driver Name *
                </label>
                <input
                  type="text"
                  value={newDriver.name}
                  onChange={(e) => setNewDriver(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Stephen"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number * (for SMS)
                </label>
                <input
                  type="tel"
                  value={newDriver.phone}
                  onChange={(e) => setNewDriver(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 0830230610 or +353830230610"
                />
                <p className="mt-1 text-xs text-gray-500">Irish numbers starting with 08 will be auto-converted to +353</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowDriverModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md font-medium hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewDriver}
                disabled={savingDriver || !newDriver.name.trim() || !newDriver.phone.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {savingDriver ? 'Saving...' : 'Save Driver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
