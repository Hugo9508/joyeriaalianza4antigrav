import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lgdhnkfxberjzctgywiz.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY no definida');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Types
export interface Order {
    id: string;
    order_number: string;
    source: 'woocommerce' | 'whatsapp' | 'manual';
    source_id: string | null;
    kanban_status: 'new' | 'analysis' | 'preparing' | 'ready' | 'completed';
    customer_name: string;
    customer_email: string | null;
    customer_phone: string | null;
    customer_address: string | null;
    customer_type: string;
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
    payment_method: string;
    notes: string | null;
    assigned_to: string | null;
    created_at: string;
    updated_at: string;
    order_items?: OrderItem[];
}

export interface OrderItem {
    id: string;
    order_id: string;
    product_id: string | null;
    product_name: string;
    sku: string | null;
    quantity: number;
    unit_price: number;
    total: number;
}

export type KanbanStatus = Order['kanban_status'];
export type OrderSource = Order['source'];

export const KANBAN_COLUMNS: { id: KanbanStatus; label: string; color: string }[] = [
    { id: 'new', label: 'NUEVOS', color: '#10B981' },
    { id: 'analysis', label: 'EN ANÁLISIS', color: '#F97316' },
    { id: 'preparing', label: 'PREPARANDO', color: '#3B82F6' },
    { id: 'ready', label: 'LISTO', color: '#8B5CF6' },
    { id: 'completed', label: 'COMPLETADO', color: '#6B7280' },
];

export const SOURCE_CONFIG: Record<OrderSource, { label: string; color: string; bg: string }> = {
    woocommerce: { label: 'Web', color: 'text-blue-300', bg: 'bg-blue-900/30' },
    whatsapp: { label: 'WhatsApp', color: 'text-green-300', bg: 'bg-green-900/30' },
    manual: { label: 'Manual', color: 'text-purple-300', bg: 'bg-purple-900/30' },
};
