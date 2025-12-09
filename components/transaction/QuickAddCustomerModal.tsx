import React, { useState } from 'react';
import { Customer, QuickAddCustomerData } from '../../types';
import { customerService } from '../../services/customerService';
import { Button, Input, Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui';
import { User, Phone, Loader2 } from 'lucide-react';
import { useLanguage } from '../../src/contexts/LanguageContext';

interface QuickAddCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (customer: Customer) => void;
    defaultPhone?: string;
    defaultName?: string;
}

export const QuickAddCustomerModal: React.FC<QuickAddCustomerModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    defaultPhone = '',
    defaultName = ''
}) => {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<QuickAddCustomerData>({
        first_name: defaultName,
        phone: defaultPhone
    });
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.first_name.trim()) {
            setError('กรุณาระบุชื่อลูกค้า');
            return;
        }

        if (!formData.phone.trim()) {
            setError('กรุณาระบุเบอร์โทรศัพท์');
            return;
        }

        // Validate phone format (Thai mobile number)
        const phoneRegex = /^0\d{9}$/;
        if (!phoneRegex.test(formData.phone.replace(/-/g, ''))) {
            setError('รูปแบบเบอร์โทรไม่ถูกต้อง (เช่น 0812345678)');
            return;
        }

        setLoading(true);
        try {
            const newCustomer = await customerService.createCustomer({
                first_name: formData.first_name.trim(),
                last_name: '',
                phone: formData.phone.replace(/-/g, ''),
                email: '',
                tier: 'Standard'
            });

            if (newCustomer) {
                onSuccess(newCustomer);
                setFormData({ first_name: '', phone: '' });
            }
        } catch (err: unknown) {
            console.error('Failed to create customer:', err);
            setError('ไม่สามารถสร้างลูกค้าได้ กรุณาลองใหม่');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({ first_name: defaultName, phone: defaultPhone });
        setError('');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-600" />
                        เพิ่มลูกค้าใหม่ (Quick Add)
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                            <User className="w-4 h-4" />
                            ชื่อลูกค้า <span className="text-red-500">*</span>
                        </label>
                        <Input
                            placeholder="ชื่อจริง หรือ ชื่อเล่น"
                            value={formData.first_name}
                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                        </label>
                        <Input
                            placeholder="0812345678"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            maxLength={10}
                        />
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                            ยกเลิก
                        </Button>
                        <Button type="submit" disabled={loading} className="flex-1">
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    กำลังบันทึก...
                                </>
                            ) : (
                                'บันทึก'
                            )}
                        </Button>
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                        * ข้อมูลนี้จะถูกบันทึกทันที สามารถแก้ไขเพิ่มเติมได้ภายหลัง
                    </p>
                </form>
            </DialogContent>
        </Dialog>
    );
};
