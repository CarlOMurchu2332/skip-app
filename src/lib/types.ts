// Database types for Skip App

export interface Customer {
  id: string;
  name: string;
  address?: string;
  contact_name?: string;
  contact_phone?: string;
  notes?: string;
  created_at: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  is_active: boolean;
  created_at: string;
}

export type JobStatus = 'created' | 'sent' | 'in_progress' | 'completed' | 'cancelled';

export interface SkipJob {
  id: string;
  created_at: string;
  job_date: string;
  customer_id: string;
  driver_id: string;
  truck_reg: string;
  docket_no: string;
  status: JobStatus;
  job_token: string;
  notes?: string;
  office_action?: SkipAction;
  skip_size?: SkipSize;
  truck_type?: TruckType;
  sent_at?: string;
  started_at?: string;
  completed_at?: string;
  // Joined fields
  customer?: Customer;
  driver?: Driver;
  completion?: SkipJobCompletion;
}

export type SkipSize = '8' | '12' | '14' | '16' | '20' | '35' | '40';
export type SkipAction = 'drop' | 'pick' | 'pick_drop';

export interface SkipJobCompletion {
  id: string;
  skip_job_id: string;
  skip_size: SkipSize;
  action: SkipAction;
  pick_size?: SkipSize;
  drop_size?: SkipSize;
  site_company?: string;
  customer_signature?: string;
  pick_lat?: number;
  pick_lng?: number;
  drop_lat?: number;
  drop_lng?: number;
  lat?: number;
  lng?: number;
  accuracy_m?: number;
  net_weight_kg?: number;
  material_type?: string;
  completed_time: string;
  driver_notes?: string;
  created_at: string;
}

// API Request/Response types
export interface CreateJobRequest {
  customer_id: string;
  driver_id: string;
  truck_reg: string;
  job_date: string;
  notes?: string;
  office_action?: SkipAction;
}

export interface SendJobRequest {
  job_id: string;
}

export interface CompleteJobRequest {
  token: string;
  skip_size?: SkipSize;
  action: SkipAction;
  pick_size?: SkipSize;
  drop_size?: SkipSize;
  site_company?: string;
  customer_signature?: string;
  pick_lat?: number;
  pick_lng?: number;
  drop_lat?: number;
  drop_lng?: number;
  lat?: number;
  lng?: number;
  accuracy_m?: number;
  driver_notes?: string;
}

// Display helpers
export const SKIP_SIZES: { value: SkipSize; label: string }[] = [
  { value: '8', label: '8y' },
  { value: '12', label: '12y' },
  { value: '14', label: '14y' },
  { value: '16', label: '16y' },
  { value: '20', label: '20y' },
  { value: '35', label: '35y' },
  { value: '40', label: '40y' },
];

export const SKIP_ACTIONS: { value: SkipAction; label: string }[] = [
  { value: 'drop', label: 'Drop' },
  { value: 'pick', label: 'Pick' },
  { value: 'pick_drop', label: 'Pick & Drop' },
];

export type TruckType = 'chain_lift' | 'hook_loader';

export const TRUCK_TYPES: { value: TruckType; label: string }[] = [
  { value: 'chain_lift', label: 'Chain Lift' },
  { value: 'hook_loader', label: 'Hook Loader' },
];

export const STATUS_COLORS: Record<JobStatus, string> = {
  created: 'bg-gray-200 text-gray-800',
  sent: 'bg-blue-200 text-blue-800',
  in_progress: 'bg-yellow-200 text-yellow-800',
  completed: 'bg-green-200 text-green-800',
  cancelled: 'bg-red-200 text-red-800',
};

export const STATUS_LABELS: Record<JobStatus, string> = {
  created: 'Created',
  sent: 'Sent',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
