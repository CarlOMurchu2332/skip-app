'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { SkipJob, STATUS_COLORS, STATUS_LABELS } from '@/lib/types';
import BottomNav from '@/components/BottomNav';

type TabType = 'new' | 'today' | 'all' | 'completed';

interface GroupedJobs {
  [year: string]: {
    [month: string]: SkipJob[];
  };
}

export default function DriverJobsPage() {
  const [jobs, setJobs] = useState<SkipJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('new');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Check online status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchJobs = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    
    try {
      const { data, error } = await supabase
        .from('skip_jobs')
        .select(`
          *,
          customer:customers(id, name, address),
          driver:drivers(id, name)
        `)
        .order('job_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching jobs:', error);
        return;
      }

      setJobs(data || []);
      setLastSync(new Date());
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleRefresh = () => {
    fetchJobs(true);
  };

  // Filter jobs based on active tab
  const getFilteredJobs = (): SkipJob[] => {
    const today = new Date().toISOString().split('T')[0];
    
    switch (activeTab) {
      case 'new':
        // Jobs that are sent or in_progress (active jobs)
        return jobs.filter(j => j.status === 'sent' || j.status === 'in_progress' || j.status === 'created');
      case 'today':
        return jobs.filter(j => j.job_date === today);
      case 'completed':
        return jobs.filter(j => j.status === 'completed');
      case 'all':
      default:
        return jobs;
    }
  };

  // Group jobs by year and month for completed view
  const groupJobsByDate = (jobList: SkipJob[]): GroupedJobs => {
    const grouped: GroupedJobs = {};
    
    jobList.forEach(job => {
      const date = new Date(job.completed_at || job.job_date);
      const year = date.getFullYear().toString();
      const month = date.toLocaleString('en-IE', { month: 'long' });
      
      if (!grouped[year]) grouped[year] = {};
      if (!grouped[year][month]) grouped[year][month] = [];
      grouped[year][month].push(job);
    });
    
    return grouped;
  };

  const filteredJobs = getFilteredJobs();
  const groupedJobs = activeTab === 'completed' ? groupJobsByDate(filteredJobs) : null;

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'new', label: 'New', count: jobs.filter(j => j.status === 'sent' || j.status === 'in_progress' || j.status === 'created').length },
    { key: 'today', label: 'Today', count: jobs.filter(j => j.job_date === new Date().toISOString().split('T')[0]).length },
    { key: 'all', label: 'All', count: jobs.length },
    { key: 'completed', label: 'Done', count: jobs.filter(j => j.status === 'completed').length },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center ">
        <div className="text-xl text-white">Loading jobs...</div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen text-white pb-20"
      
    >
      {/* Sticky Logo Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-[#1a1a1a] via-[#1a1a1a]/95 to-[#1a1a1a]/80 backdrop-blur-sm">
        <div className="flex justify-center py-4">
          <Link href="/">
            <Image 
              src="/imr-logo.png" 
              alt="Irish Metals Recycling" 
              width={120}
              height={120}
              className="drop-shadow-2xl"
            />
          </Link>
        </div>
        
        {/* Title and Controls */}
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold">🚛 Driver Jobs</h1>
            <div className="flex items-center gap-3">
              {/* Online/Offline indicator */}
              <div className="flex items-center gap-1">
                <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-gray-400">{isOnline ? 'Online' : 'Offline'}</span>
              </div>
              {/* Refresh button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 bg-blue-600/80 hover:bg-blue-600 rounded-lg disabled:opacity-50 transition-colors"
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
          </div>
          
          {/* Last sync indicator */}
          {lastSync && (
            <div className="text-xs text-gray-500 mb-3">
              Last sync: {lastSync.toLocaleTimeString('en-IE')}
            </div>
          )}
        </div>
        
        {/* Tabs */}
        <div className="px-4 pb-3">
          <div className="flex gap-1 bg-gray-800/50 rounded-xl p-1 border border-gray-700/50">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-600'
                }`}
              >
                {tab.label}
                <span className="ml-1 text-xs opacity-70">({tab.count})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="p-4">
        {filteredJobs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-2">📋</div>
            <p>No jobs found</p>
          </div>
        ) : activeTab === 'completed' && groupedJobs ? (
          // Grouped view for completed jobs
          <div className="space-y-6">
            {Object.entries(groupedJobs)
              .sort(([a], [b]) => parseInt(b) - parseInt(a))
              .map(([year, months]) => (
                <div key={year}>
                  <h2 className="text-lg font-bold text-gray-300 mb-3">{year}</h2>
                  {Object.entries(months)
                    .sort(([a], [b]) => {
                      const monthOrder = ['December', 'November', 'October', 'September', 'August', 'July', 'June', 'May', 'April', 'March', 'February', 'January'];
                      return monthOrder.indexOf(a) - monthOrder.indexOf(b);
                    })
                    .map(([month, monthJobs]) => (
                      <div key={month} className="mb-4">
                        <h3 className="text-md font-semibold text-gray-400 mb-2 pl-2">{month}</h3>
                        <div className="space-y-2">
                          {monthJobs.map(job => (
                            <JobCard key={job.id} job={job} />
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              ))}
          </div>
        ) : (
          // Regular list view
          <div className="space-y-3">
            {filteredJobs.map(job => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
      
      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

function JobCard({ job }: { job: SkipJob }) {
  const isUrgent = job.status === 'in_progress';
  const isNew = job.status === 'sent' || job.status === 'created';
  
  return (
    <Link href={`/driver/jobs/${job.id}`}>
      <div className={`bg-gradient-to-br from-gray-800/90 to-gray-900/95 backdrop-blur-lg rounded-2xl p-4 border border-gray-700/50 shadow-lg active:scale-[0.98] transition-all ${
        isUrgent ? 'border-l-4 border-l-yellow-500' : isNew ? 'border-l-4 border-l-blue-500' : job.status === 'completed' ? 'border-l-4 border-l-green-500' : ''
      }`}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="font-bold text-lg text-white">{job.customer?.name || 'Unknown Customer'}</div>
            <div className="text-sm text-blue-400 font-mono">{job.docket_no}</div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[job.status]}`}>
            {STATUS_LABELS[job.status]}
          </span>
        </div>
        
        {job.customer?.address && (
          <div className="text-sm text-gray-300 mb-3 flex items-center gap-2">
            <span>📍</span>
            <span className="truncate">{job.customer.address}</span>
          </div>
        )}
        
        <div className="flex justify-between items-center text-sm text-gray-400">
          <div className="flex items-center gap-2">
            {job.office_action && (
              <span className="bg-blue-600/30 text-blue-300 px-2 py-1 rounded-lg text-xs border border-blue-500/30">
                {job.office_action === 'pick_drop' ? 'Pick & Drop' : job.office_action.charAt(0).toUpperCase() + job.office_action.slice(1)}
              </span>
            )}
            {job.truck_reg && <span className="text-gray-300">🚛 {job.truck_reg}</span>}
          </div>
          <div className="text-gray-400 text-sm">
            {new Date(job.job_date).toLocaleDateString('en-IE', { 
              weekday: 'short',
              day: 'numeric', 
              month: 'short' 
            })}
          </div>
        </div>
        
        {job.notes && (
          <div className="mt-3 pt-3 border-t border-gray-700/50">
            <div className="text-xs text-yellow-400 truncate">📝 {job.notes}</div>
          </div>
        )}
      </div>
    </Link>
  );
}
