import React, { useState, useEffect } from 'react';
import { Product, TransactionItemPayload } from '../../types';
import { productService } from '../../services/productService';
import { Button, Input, Badge } from '../ui';
import { Trash2, ChevronDown, ChevronUp, CalendarDays, Zap } from 'lucide-react';
import { ServiceFlowTimeline } from './ServiceFlowTimeline';
import { useLanguage } from '../../src/contexts/LanguageContext';

interface ProductPickerItemProps {
    item: TransactionItemPayload & { id?: string };
    index: number;
    products: Product[];
    onUpdate: (index: number, item: TransactionItemPayload) => void;
    onRemove: (index: number) => void;
}

export const ProductPickerItem: React.FC<ProductPickerItemProps> = ({
    item,
    index,
    products,
    onUpdate,
    onRemove
}) => {
    const { t } = useLanguage();
    const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    useEffect(() => {
        // Find the selected product
        if (item.product_id) {
            const product = products.find(p => p.id === item.product_id);
            setSelectedProduct(product || null);

            // Auto-expand timeline if product has service flow
            if (product?.has_service_flow) {
                setIsTimelineExpanded(true);
            }
        } else {
            setSelectedProduct(null);
        }
    }, [item.product_id, products]);

    const handleProductChange = (productId: string) => {
        const product = products.find(p => p.id === productId);
        if (product) {
            const today = new Date().toISOString().split('T')[0];
            onUpdate(index, {
                ...item,
                product_id: product.id,
                unit_price: product.selling_price,
                total_price: item.quantity * product.selling_price,
                enable_service_flow: product.has_service_flow,
                service_start_date: product.has_service_flow ? today : undefined
            });
        }
    };

    const handleQuantityChange = (quantity: number) => {
        const qty = Math.max(1, quantity);
        onUpdate(index, {
            ...item,
            quantity: qty,
            total_price: qty * item.unit_price
        });
    };

    const handleServiceFlowToggle = () => {
        onUpdate(index, {
            ...item,
            enable_service_flow: !item.enable_service_flow,
            service_start_date: !item.enable_service_flow
                ? new Date().toISOString().split('T')[0]
                : undefined
        });
    };

    const handleServiceStartDateChange = (date: string) => {
        onUpdate(index, {
            ...item,
            service_start_date: date
        });
    };

    const serviceStartDate = item.service_start_date
        ? new Date(item.service_start_date)
        : new Date();

    return (
        <div className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
            {/* Product Row */}
            <div className="flex gap-3 items-start">
                {/* Product Select */}
                <div className="flex-1">
                    <select
                        className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={item.product_id}
                        onChange={(e) => handleProductChange(e.target.value)}
                    >
                        <option value="">-- เลือกสินค้า --</option>
                        {products.map((product) => (
                            <option key={product.id} value={product.id}>
                                {product.name} {product.sku ? `(${product.sku})` : ''} - ฿{product.selling_price.toLocaleString()}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Quantity */}
                <div className="w-20">
                    <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                        className="text-center"
                    />
                </div>

                {/* Total */}
                <div className="w-28 text-right">
                    <div className="text-lg font-semibold text-gray-900">
                        ฿{item.total_price.toLocaleString()}
                    </div>
                </div>

                {/* Remove Button */}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>

            {/* Service Flow Section (only if product has service flow) */}
            {selectedProduct?.has_service_flow && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                    {/* Toggle Row */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleServiceFlowToggle}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${item.enable_service_flow ? 'bg-blue-600' : 'bg-gray-200'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${item.enable_service_flow ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                            <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                <Zap className="w-4 h-4 text-yellow-500" />
                                เปิด Auto Service
                            </span>
                            {item.enable_service_flow && (
                                <Badge variant="success" className="text-xs">ON</Badge>
                            )}
                        </div>

                        {/* Timeline Toggle */}
                        {item.enable_service_flow && (
                            <button
                                type="button"
                                onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
                                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                                {isTimelineExpanded ? (
                                    <>ซ่อนตาราง <ChevronUp className="w-4 h-4" /></>
                                ) : (
                                    <>ดูตาราง <ChevronDown className="w-4 h-4" /></>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Service Start Date & Timeline */}
                    {item.enable_service_flow && (
                        <div className="mt-3 space-y-3">
                            {/* Service Start Date */}
                            <div className="flex items-center gap-3">
                                <label className="text-sm text-gray-600 flex items-center gap-1 whitespace-nowrap">
                                    <CalendarDays className="w-4 h-4" />
                                    วันเริ่มบริการ:
                                </label>
                                <Input
                                    type="date"
                                    value={item.service_start_date || ''}
                                    onChange={(e) => handleServiceStartDateChange(e.target.value)}
                                    className="w-40"
                                />
                                <span className="text-xs text-gray-500">
                                    (ระบบจะนับ Flow จากวันนี้)
                                </span>
                            </div>

                            {/* Timeline Preview */}
                            {isTimelineExpanded && selectedProduct && (
                                <ServiceFlowTimeline
                                    product={selectedProduct}
                                    serviceStartDate={serviceStartDate}
                                />
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Non-service product indicator */}
            {selectedProduct && !selectedProduct.has_service_flow && (
                <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-300" />
                    ไม่มี Auto Service Flow
                </div>
            )}
        </div>
    );
};
