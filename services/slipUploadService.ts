import { supabase } from '../lib/supabase';

export const slipUploadService = {
    async uploadSlip(file: File): Promise<string> {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('slips')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            throw uploadError;
        }

        const { data } = supabase.storage
            .from('slips')
            .getPublicUrl(fileName);

        return data.publicUrl;
    },

    async deleteSlip(url: string): Promise<void> {
        // Extract filename from URL
        const urlParts = url.split('/');
        const fileName = urlParts[urlParts.length - 1];

        const { error } = await supabase.storage
            .from('slips')
            .remove([fileName]);

        if (error) {
            console.error('Delete error:', error);
            throw error;
        }
    }
};
