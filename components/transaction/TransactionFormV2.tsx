import React, { useState, useEffect } from 'react';
import { Customer, Product, Transaction, TransactionItemPayload, VatSettings } from '../../types';
import { productService } from '../../services/productService';
import { transactionService } from '../../services/transactionService';
import { shopService } from '../../services/shopService';
import { lineService } from '../../services/lineService';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../ui';
import { Plus, ShoppingCart, CalendarDays, Loader2, CheckCircle2 } from 'lucide-react';
import { CustomerSelector } from './CustomerSelector';
import { ProductPickerItem } from './ProductPickerItem';
import { PaymentSection } from './PaymentSection';
import { useLanguage } from '../../src/contexts/LanguageContext';

interface TransactionFormV2Props {
    initialData?: Transaction;
    onSuccess: () => void;
    onCancel: () => void;
}

export const TransactionFormV2: React.FC<TransactionFormV2Props> = ({
    initialData,
    onSuccess,
    onCancel
}) => {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);

    // Form State
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(initialData?.customer || null);
    const [transactionDate, setTransactionDate] = useState(
        initialData?.transaction_date
            ? new Date(initialData.transaction_date).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
    );
    const [items, setItems] = useState<TransactionItemPayload[]>([]);
    const [discount, setDiscount] = useState(initialData?.discount_amount || 0);
    const [paymentMethod, setPaymentMethod] = useState(initialData?.payment_method || 'cash');
    const [slipUrl, setSlipUrl] = useState<string | null>(initialData?.payment_slip_url || null);
    const [sendLineNotification, setSendLineNotification] = useState(initialData?.send_line_notification || false);
    const [note, setNote] = useState(initialData?.note || '');

    // VAT Settings
    const [vatSettings, setVatSettings] = useState<VatSettings>({
        enable_vat: true,
        vat_rate: 7
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Fetch products
            const productsData = await productService.getProducts();
            setProducts(productsData.filter(p => p.is_active !== false));

            // Fetch VAT settings from tenant
            const shop = await shopService.getShop();
            if (shop) {
                // Note: VAT settings would be fetched from tenants table
                // For now, use defaults since we just added the columns
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        }
    };

    const handleAddItem = () => {
        const newItem: TransactionItemPayload = {
            product_id: '',
            quantity: 1,
            unit_price: 0,
            total_price: 0,
            enable_service_flow: false,
            service_start_date: new Date().toISOString().split('T')[0]
        };
        setItems([...items, newItem]);
    };

    const handleUpdateItem = (index: number, item: TransactionItemPayload) => {
        const newItems = [...items];
        newItems[index] = item;
        setItems(newItems);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const calculateSubtotal = () => {
        return items.reduce((sum, item) => sum + (item.total_price || 0), 0);
    };

    const calculateGrandTotal = () => {
        const subtotal = calculateSubtotal();
        const afterDiscount = subtotal - discount;
        const vat = vatSettings.enable_vat
            ? Math.round(afterDiscount * (vatSettings.vat_rate / 100))
            : 0;
        return afterDiscount + vat;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedCustomer) {
            alert('กรุณาเลือกลูกค้า');
            return;
        }

        if (items.length === 0 || !items.some(i => i.product_id)) {
            alert('กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ');
            return;
        }

        setLoading(true);
        try {
            const subtotal = calculateSubtotal();
            const netAmount = calculateGrandTotal();

            const transactionData = {
                customer_id: selectedCustomer.id,
                transaction_date: transactionDate,
                total_amount: subtotal,
                discount_amount: discount,
                net_amount: netAmount,
                status: 'completed' as const,
                payment_method: paymentMethod,
                payment_slip_url: slipUrl,
                note: note,
                send_line_notification: sendLineNotification
            };

            // Filter valid items
            const validItems = items.filter(i => i.product_id);

            if (initialData) {
                await transactionService.updateTransaction(initialData.id, transactionData, validItems);
            } else {
                const newTransaction = await transactionService.createTransaction(transactionData, validItems);

                // Send LINE notification if enabled
                if (sendLineNotification && selectedCustomer.line_user_id) {
                    try {
                        const productNames = validItems.map(i => {
                            const product = products.find(p => p.id === i.product_id);
                            return product?.name || 'สินค้า';
                        }).join(', ');

                        await lineService.sendMessage(
                            selectedCustomer.id,
                            `🎉 ขอบคุณที่ซื้อสินค้ากับเรา!\n\n📦 สินค้า: ${productNames}\n💰 ยอดชำระ: ฿${netAmount.toLocaleString()}\n🧾 เลขที่: ${newTransaction.transaction_no || newTransaction.id.slice(0, 8)}\n\nใบรับประกันจะถูกจัดส่งให้ทาง LINE ภายใน 24 ชม.`
                        );
                    } catch (lineError) {
                        console.error('Failed to send LINE notification:', lineError);
                        // Don't block transaction success
                    }
                }
            }

            setSuccess(true);
            setTimeout(() => {
                onSuccess();
            }, 1500);

        } catch (error) {
            console.error('Failed to save transaction:', error);
            alert('ไม่สามารถบันทึกรายการได้ กรุณาลองใหม่');
        } finally {
            setLoading(false);
        }
    };

    const selectedProductIds = items.map(i => i.product_id).filter(Boolean);

    // Success State
    if (success) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">บันทึกรายการสำเร็จ!</h3>
                <p className="text-gray-500">กำลังปิดหน้าต่าง...</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Section */}
            <CustomerSelector
                selectedCustomer={selectedCustomer}
                onSelect={setSelectedCustomer}
                selectedProductIds={selectedProductIds}
            />

            {/* Transaction Date */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    วันที่ทำรายการ
                </label>
                <input
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    className="w-48 h-10 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Products Section */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <ShoppingCart className="w-5 h-5 text-blue-600" />
                            รายการสินค้า
                        </CardTitle>
                        <Button type="button" size="sm" onClick={handleAddItem}>
                            <Plus className="w-4 h-4 mr-1" />
                            เพิ่มสินค้า
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {items.length === 0 ? (
                        <div
                            className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                            onClick={handleAddItem}
                        >
                            <ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500">คลิกเพื่อเพิ่มสินค้า</p>
                        </div>
                    ) : (
                        items.map((item, index) => (
                            <ProductPickerItem
                                key={index}
                                item={item}
                                index={index}
                                products={products}
                                onUpdate={handleUpdateItem}
                                onRemove={handleRemoveItem}
                            />
                        ))
                    )}
                </CardContent>
            </Card>

            {/* Payment Section */}
            {items.length > 0 && items.some(i => i.product_id) && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">การชำระเงิน</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <PaymentSection
                            subtotal={calculateSubtotal()}
                            discount={discount}
                            vatSettings={vatSettings}
                            paymentMethod={paymentMethod}
                            slipUrl={slipUrl}
                            sendLineNotification={sendLineNotification}
                            note={note}
                            onDiscountChange={setDiscount}
                            onPaymentMethodChange={setPaymentMethod}
                            onSlipUpload={setSlipUrl}
                            onSendLineChange={setSendLineNotification}
                            onNoteChange={setNote}
                        />
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onCancel}>
                    ยกเลิก
                </Button>
                <Button
                    type="submit"
                    disabled={loading || !selectedCustomer || items.length === 0}
                    className="min-w-[140px]"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            กำลังบันทึก...
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            {initialData ? 'อัปเดตรายการ' : 'บันทึกรายการ'}
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
};
