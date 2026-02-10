'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { SKIP_SIZES } from '@/lib/types';
import OfficeBottomNav from '@/components/OfficeBottomNav';

interface SkipLocation {
  skipSize: string;
  customerName: string;
  customerAddress?: string;
  docketNo: string;
  completedAt: string;
  driverName?: string;
  location: 'yard' | 'site';
  action: string;
}

export default function SkipTrackerPage() {
  const [locations, setLocations] = useState<SkipLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    loadSkipLocations();
  }, []);

  async function loadSkipLocations(showRefreshing = false) {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('skip_job_completion')
        .select(`
          *,
          skip_job:skip_jobs(
            docket_no,
            customer:customers(name, address),
            driver:drivers(name)
          )
        `)
        .order('completed_time', { ascending: false });

      if (error) throw error;

      const skipLocations: SkipLocation[] = [];
      
      (data || []).forEach((completion) => {
        const job = completion.skip_job as any;
        
        // If action includes drop, skip is on site
        if (completion.action === 'drop' || completion.action === 'pick_drop') {
          if (completion.drop_size) {
            skipLocations.push({
              skipSize: completion.drop_size,
              customerName: job?.customer?.name || 'Unknown',
              customerAddress: job?.customer?.address,
              docketNo: job?.docket_no || '-',
              completedAt: completion.completed_time,
              driverName: job?.driver?.name,
              location: 'site',
              action: completion.action,
            });
          }
        }
        
        // If action includes pick, skip returned to yard
        if (completion.action === 'pick' || completion.action === 'pick_drop') {
          if (completion.pick_size) {
            skipLocations.push({
              skipSize: completion.pick_size,
              customerName: job?.customer?.name || 'Yard',
              customerAddress: undefined,
              docketNo: job?.docket_no || '-',
              completedAt: completion.completed_time,
              driverName: job?.driver?.name,
              location: 'yard',
              action: completion.action,
            });
          }
        }
      });

      setLocations(skipLocations);
      setLastSync(new Date());
    } catch (err) {
      console.error('Error loading skip locations:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const handleRefresh = () => {
    loadSkipLocations(true);
  };

  const onSiteSkips = locations.filter(l => l.location === 'site');
  const inYardSkips = locations.filter(l => l.location === 'yard');

  // Count unique skip sizes
  const countBySize = (skips: SkipLocation[]) => {
    const counts: Record<string, number> = {};
    skips.forEach(skip => {
      counts[skip.skipSize] = (counts[skip.skipSize] || 0) + 1;
    });
    return counts;
  };

  const onSiteCounts = countBySize(onSiteSkips);
  const inYardCounts = countBySize(inYardSkips);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-white">Loading tracker...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 pb-20">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <Image
              src="/imr-logo.png"
              alt="Irish Metals Logo"
              width={140}
              height={50}
              priority
            />
            <h1 className="text-2xl font-bold text-white">📍 Skip Tracker</h1>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 transition-colors"
            title="Refresh tracker"
          >
            <svg 
              className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Last sync */}
        {lastSync && (
          <div className="text-xs text-gray-400 mb-6">
            Last sync: {lastSync.toLocaleTimeString('en-IE')}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white shadow-lg">
            <div className="text-sm opacity-90 mb-1">On Customer Sites</div>
            <div className="text-4xl font-bold">{onSiteSkips.length}</div>
            <div className="text-xs opacity-75 mt-2">
              {Object.entries(onSiteCounts).map(([size, count]) => (
                <span key={size} className="mr-2">
                  {SKIP_SIZES.find(s => s.value === size)?.label || size}: {count}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
            <div className="text-sm opacity-90 mb-1">In Yard</div>
            <div className="text-4xl font-bold">{inYardSkips.length}</div>
            <div className="text-xs opacity-75 mt-2">
              {Object.entries(inYardCounts).map(([size, count]) => (
                <span key={size} className="mr-2">
                  {SKIP_SIZES.find(s => s.value === size)?.label || size}: {count}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
            <div className="text-sm opacity-90 mb-1">Total Tracked</div>
            <div className="text-4xl font-bold">{locations.length}</div>
            <div className="text-xs opacity-75 mt-2">Active skip movements</div>
          </div>
        </div>

        {/* On Site Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="bg-orange-600 text-white px-6 py-3">
            <h2 className="text-lg font-bold">🏗️ Skips On Customer Sites ({onSiteSkips.length})</h2>
          </div>
          {onSiteSkips.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No skips currently on customer sites
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Skip Size</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Customer</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Address</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Docket</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Driver</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Delivered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {onSiteSkips.map((skip, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-bold">
                          {SKIP_SIZES.find(s => s.value === skip.skipSize)?.label || skip.skipSize}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{skip.customerName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{skip.customerAddress || '-'}</td>
                      <td className="px-4 py-3 text-sm text-blue-600 font-mono">{skip.docketNo}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{skip.driverName || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(skip.completedAt).toLocaleDateString('en-IE')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* In Yard Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-green-600 text-white px-6 py-3">
            <h2 className="text-lg font-bold">🏭 Skips In Yard ({inYardSkips.length})</h2>
          </div>
          {inYardSkips.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No skips currently in yard
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Skip Size</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">From Customer</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Docket</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Driver</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Returned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {inYardSkips.map((skip, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-bold">
                          {SKIP_SIZES.find(s => s.value === skip.skipSize)?.label || skip.skipSize}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{skip.customerName}</td>
                      <td className="px-4 py-3 text-sm text-blue-600 font-mono">{skip.docketNo}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{skip.driverName || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(skip.completedAt).toLocaleDateString('en-IE')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom Navigation */}
      <OfficeBottomNav />
    </div>
  );
}
