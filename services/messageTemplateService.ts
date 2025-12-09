import { supabase } from '../lib/supabase';
import { MessageTemplate, MessageTemplateType, MessageChannel } from '../types';

export const messageTemplateService = {
    async getTemplates() {
        const { data, error } = await supabase
            .from('message_templates')
            .select('*')
            .order('type', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as MessageTemplate[];
    },

    async getTemplatesByType(type: MessageTemplateType) {
        const { data, error } = await supabase
            .from('message_templates')
            .select('*')
            .eq('type', type)
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as MessageTemplate[];
    },

    async getDefaultTemplates() {
        const { data, error } = await supabase
            .from('message_templates')
            .select('*')
            .eq('is_default', true);

        if (error) throw error;
        return data as MessageTemplate[];
    },

    async getTemplate(id: string) {
        const { data, error } = await supabase
            .from('message_templates')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as MessageTemplate;
    },

    async createTemplate(template: Partial<MessageTemplate>) {
        const { data, error } = await supabase
            .from('message_templates')
            .insert([{
                ...template,
                variables: template.variables || ['customer_name', 'product_name', 'service_date']
            }])
            .select()
            .single();

        if (error) throw error;
        return data as MessageTemplate;
    },

    async updateTemplate(id: string, updates: Partial<MessageTemplate>) {
        const { data, error } = await supabase
            .from('message_templates')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as MessageTemplate;
    },

    async deleteTemplate(id: string) {
        const { error } = await supabase
            .from('message_templates')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Helper to preview template with sample data
    previewTemplate(content: string, sampleData?: Record<string, string>): string {
        const defaultSampleData = {
            customer_name: 'คุณสมชาย',
            product_name: 'แอร์ Daikin Inverter',
            service_date: '15 มกราคม 2568',
            lifecycle_months: '24',
        };

        const data = { ...defaultSampleData, ...sampleData };
        let preview = content;

        Object.entries(data).forEach(([key, value]) => {
            preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), value);
        });

        return preview;
    }
};
