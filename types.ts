export type ViewState = 'dashboard' | 'customers' | 'customer360' | 'products' | 'transactions' | 'tasks' | 'automation' | 'superadmin' | 'settings';

export enum RFMSegment {
  CHAMPION = 'Champion',
  LOYAL = 'Loyal',
  AT_RISK = 'At Risk',
  LOST = 'Lost',
  NEW = 'New'
}

export interface AutomationJourney {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused';
  created_at: string;
  updated_at: string;
}

export interface JourneyVersion {
  id: string;
  journey_id: string;
  version_number: number;
  definition: any; // JSON of nodes and edges
  is_active: boolean;
  created_at: string;
}

export interface CustomerAddress {
  line1?: string;
  city?: string;
  zip?: string;
}

export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  nickname?: string;
  phone: string;
  email: string;
  date_of_birth?: string;
  gender?: string;
  interests?: string[];
  avatar_url?: string;
  line_user_id?: string;
  tier?: 'Standard' | 'Silver' | 'Gold' | 'Platinum';
  address?: CustomerAddress;
  referral_id?: string;
  referral?: Customer;
  tags?: string[];
  tax_id?: string;
  rfm_score?: {
    r: number;
    f: number;
    m: number;
    score: string;
    segment?: string;
  };
  clv?: number;
  segmentation_status?: string;
  last_purchase_date?: string;
  total_transactions: number;
  total_spend: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  type: 'Call' | 'SMS' | 'LINE';
  status: 'Pending' | 'Completed' | 'Overdue';
  dueDate: string;
  customerName: string;
  customerId: string;
}

export interface Tenant {
  id: string;
  name: string;
  status: 'Active' | 'Trial' | 'Suspended';
  userCount: number;
  customerCount: number;
}

export interface Shop {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

// Product Lifecycle Types
export type ProductType = 'tangible' | 'service';

export interface OnboardingConfig {
  enabled: boolean;
  task_name: string;
  message_template_id: string | null;
}

export interface RetentionConfig {
  enabled: boolean;
  reminder_days_before: number;
  message_template_id: string | null;
}

export interface MaturityConfig {
  enabled: boolean;
  task_name: string;
  message_template_id: string | null;
}

export interface ServiceFlowConfig {
  onboarding: OnboardingConfig;
  retention: RetentionConfig;
  maturity: MaturityConfig;
}

export const DEFAULT_SERVICE_FLOW_CONFIG: ServiceFlowConfig = {
  onboarding: { enabled: true, task_name: 'Install Product', message_template_id: null },
  retention: { enabled: true, reminder_days_before: 7, message_template_id: null },
  maturity: { enabled: true, task_name: 'Call for MA Renewal', message_template_id: null }
};

export interface Product {
  id: string;
  name: string;
  sku?: string;
  description?: string;
  image_url?: string;
  selling_price: number;
  cost_price?: number;
  unit?: string;
  product_type: ProductType;
  stock_quantity?: number;
  // Legacy field - kept for backward compatibility
  usage_duration_days?: number;
  // Lifecycle fields
  has_service_flow: boolean;
  lifecycle_months: number;
  service_interval_months: number;
  service_flow_config: ServiceFlowConfig;
  is_active: boolean;
  created_at: string;
}

// Message Template Types
export type MessageTemplateType = 'onboarding' | 'retention' | 'maturity';
export type MessageChannel = 'line' | 'sms' | 'email';

export interface MessageTemplate {
  id: string;
  name: string;
  type: MessageTemplateType;
  channel: MessageChannel;
  subject?: string;
  content: string;
  variables: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Timeline Preview Types
export interface FlowPreviewNode {
  month: number;
  date: string;
  phase: 'onboarding' | 'retention' | 'maturity';
  action: string;
  customMessage?: string;
}

// Scheduled Service Task Types
export type ScheduledTaskStatus = 'pending' | 'sent' | 'completed' | 'cancelled';

export interface ScheduledServiceTask {
  id: string;
  customer_product_id: string;
  customer_id: string;
  phase: 'onboarding' | 'retention' | 'maturity';
  scheduled_date: string;
  task_name?: string;
  message_template_id?: string;
  message_template?: MessageTemplate;
  status: ScheduledTaskStatus;
  executed_at?: string;
  created_at: string;
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id: string;
  product_name?: string;
  product?: Product; // For timeline preview
  quantity: number;
  unit_price: number;
  total_price: number;
  enable_service_flow?: boolean;
  service_start_date?: string;
}

export interface Transaction {
  id: string;
  customer_id: string;
  customer?: Customer;
  transaction_no?: string;
  total_amount: number;
  discount_amount?: number;
  net_amount?: number;
  status: 'completed' | 'pending' | 'cancelled';
  payment_status?: 'Pending' | 'Paid' | 'Cancelled';
  payment_method?: string;
  payment_slip_url?: string;
  note?: string;
  send_line_notification?: boolean;
  created_by?: string;
  transaction_date: string;
  items?: TransactionItem[];
  created_at: string;
}

// Quick Add Customer (minimal fields)
export interface QuickAddCustomerData {
  first_name: string;
  phone: string;
}

// Transaction Form Payload
export interface CreateTransactionPayload {
  customer_id: string;
  transaction_date: string;
  total_amount: number;
  discount_amount?: number;
  net_amount?: number;
  payment_method?: string;
  payment_slip_url?: string;
  note?: string;
  send_line_notification?: boolean;
  items: TransactionItemPayload[];
}

export interface TransactionItemPayload {
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  enable_service_flow: boolean;
  service_start_date?: string;
}

// VAT Settings
export interface VatSettings {
  enable_vat: boolean;
  vat_rate: number;
}

// Customer 360 Types
export interface CustomerNote {
  id: string;
  customer_id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerProduct {
  id: string;
  customer_id: string;
  product_id: string;
  product?: Product;
  transaction_id?: string;
  transaction_item_id?: string;
  quantity: number;
  installation_date?: string;
  warranty_end_date?: string;
  next_service_date?: string;
  status: 'active' | 'expired' | 'serviced';
  // Snapshot fields - config at time of purchase
  service_flow_config_snapshot?: ServiceFlowConfig;
  lifecycle_months_snapshot?: number;
  service_interval_months_snapshot?: number;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  customer_id: string;
  type: 'order' | 'chat' | 'call' | 'auto';
  title: string;
  description?: string;
  amount?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
}
