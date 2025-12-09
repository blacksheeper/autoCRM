import React, { useState, useRef } from 'react';
import { VatSettings } from '../../types';
import { Input, Button, Badge } from '../ui';
import { CreditCard, Banknote, Upload, MessageCircle, Calculator, Receipt, Loader2 } from 'lucide-react';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { slipUploadService } from '../../services/slipUploadService';

interface PaymentSectionProps {
    subtotal: number;
    discount: number;
    vatSettings: VatSettings;
    paymentMethod: string;
    slipUrl: string | null;
    sendLineNotification: boolean;
    note: string;
    onDiscountChange: (discount: number) => void;
    onPaymentMethodChange: (method: string) => void;
    onSlipUpload: (url: string) => void;
    onSendLineChange: (send: boolean) => void;
    onNoteChange: (note: string) => void;
}

const PAYMENT_METHODS = [
    { value: 'cash', label: 'เงินสด', icon: Banknote },
    { value: 'transfer', label: 'โอนเงิน', icon: Receipt },
    { value: 'credit_card', label: 'บัตรเครดิต', icon: CreditCard },
];

export const PaymentSection: React.FC<PaymentSectionProps> = ({
    subtotal,
    discount,
    vatSettings,
    paymentMethod,
    slipUrl,
    sendLineNotification,
    note,
    onDiscountChange,
    onPaymentMethodChange,
    onSlipUpload,
    onSendLineChange,
    onNoteChange
}) => {
    const { t } = useLanguage();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');

    // Calculate amounts
    const afterDiscount = subtotal - discount;
    const vatAmount = vatSettings.enable_vat
        ? Math.round(afterDiscount * (vatSettings.vat_rate / 100))
        : 0;
    const grandTotal = afterDiscount + vatAmount;

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setUploadError('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setUploadError('ไฟล์มีขนาดใหญ่เกิน 5MB');
            return;
        }

        setUploading(true);
        setUploadError('');

        try {
            const url = await slipUploadService.uploadSlip(file);
            onSlipUpload(url);
        } catch (error) {
            console.error('Upload failed:', error);
            setUploadError('อัปโหลดไม่สำเร็จ กรุณาลองใหม่');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Payment Method */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">ช่องทางชำระเงิน</label>
                <div className="flex gap-2">
                    {PAYMENT_METHODS.map((method) => {
                        const Icon = method.icon;
                        const isSelected = paymentMethod === method.value;
                        return (
                            <button
                                key={method.value}
                                type="button"
                                onClick={() => onPaymentMethodChange(method.value)}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all ${isSelected
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                <span className="font-medium">{method.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Slip Upload (only for transfer) */}
            {paymentMethod === 'transfer' && (
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">แนบสลิปโอนเงิน</label>
                    <div className="flex gap-3 items-center">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept="image/*"
                            className="hidden"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    กำลังอัปโหลด...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    {slipUrl ? 'เปลี่ยนสลิป' : 'อัปโหลดสลิป'}
                                </>
                            )}
                        </Button>
                        {slipUrl && (
                            <div className="flex items-center gap-2">
                                <img
                                    src={slipUrl}
                                    alt="Slip"
                                    className="w-12 h-12 object-cover rounded border"
                                />
                                <Badge variant="success">อัปโหลดแล้ว</Badge>
                            </div>
                        )}
                    </div>
                    {uploadError && (
                        <p className="text-sm text-red-500">{uploadError}</p>
                    )}
                </div>
            )}

            {/* Note */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">หมายเหตุ (ถ้ามี)</label>
                <Input
                    placeholder="เช่น ลูกค้าขอใบกำกับภาษี, นัดติดตั้งวันศุกร์"
                    value={note}
                    onChange={(e) => onNoteChange(e.target.value)}
                />
            </div>

            {/* LINE Notification Checkbox */}
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <input
                    type="checkbox"
                    id="sendLine"
                    checked={sendLineNotification}
                    onChange={(e) => onSendLineChange(e.target.checked)}
                    className="w-5 h-5 rounded border-green-300 text-green-600 focus:ring-green-500"
                />
                <label htmlFor="sendLine" className="flex items-center gap-2 text-green-800 cursor-pointer">
                    <MessageCircle className="w-5 h-5" />
                    <span className="font-medium">ส่งบิลและใบรับประกันทาง LINE ทันที</span>
                </label>
            </div>

            {/* Price Summary */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 mb-3">
                    <Calculator className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-700">สรุปยอดชำระ</span>
                </div>

                {/* Subtotal */}
                <div className="flex justify-between text-gray-600">
                    <span>ยอดรวม</span>
                    <span>฿{subtotal.toLocaleString()}</span>
                </div>

                {/* Discount */}
                <div className="flex justify-between items-center">
                    <span className="text-gray-600">ส่วนลด</span>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500">-฿</span>
                        <Input
                            type="number"
                            min="0"
                            max={subtotal}
                            value={discount || ''}
                            onChange={(e) => onDiscountChange(Math.min(subtotal, parseInt(e.target.value) || 0))}
                            className="w-24 text-right"
                            placeholder="0"
                        />
                    </div>
                </div>

                {/* VAT */}
                {vatSettings.enable_vat && (
                    <div className="flex justify-between text-gray-600">
                        <span>VAT {vatSettings.vat_rate}%</span>
                        <span className="text-gray-500">+฿{vatAmount.toLocaleString()}</span>
                    </div>
                )}

                {/* Divider */}
                <div className="border-t border-gray-200 my-2" />

                {/* Grand Total */}
                <div className="flex justify-between text-xl font-bold text-gray-900">
                    <span>รวมทั้งสิ้น</span>
                    <span className="text-blue-600">฿{grandTotal.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
};
