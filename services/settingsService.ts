import { supabase } from '../lib/supabase';
import { VatSettings } from '../types';

export const settingsService = {
    async getVatSettings(): Promise<VatSettings> {
        try {
            // Try to get from tenants table
            const { data, error } = await supabase
                .from('tenants')
                .select('enable_vat, vat_rate')
                .limit(1)
                .single();

            if (error || !data) {
                // Return defaults if no tenant found
                return {
                    enable_vat: true,
                    vat_rate: 7
                };
            }

            return {
                enable_vat: data.enable_vat ?? true,
                vat_rate: data.vat_rate ?? 7
            };
        } catch (error) {
            console.error('Failed to fetch VAT settings:', error);
            return {
                enable_vat: true,
                vat_rate: 7
            };
        }
    },

    async updateVatSettings(tenantId: string, settings: Partial<VatSettings>): Promise<void> {
        const { error } = await supabase
            .from('tenants')
            .update({
                enable_vat: settings.enable_vat,
                vat_rate: settings.vat_rate
            })
            .eq('id', tenantId);

        if (error) throw error;
    }
};
