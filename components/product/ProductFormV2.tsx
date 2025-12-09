import React, { useState, useEffect } from 'react';
import { Product, ProductType, ServiceFlowConfig, DEFAULT_SERVICE_FLOW_CONFIG } from '../../types';
import { productService } from '../../services/productService';
import { aiSuggestProductConfig } from '../../services/aiProductService';
import { ServiceFlowBuilder } from './ServiceFlowBuilder';
import { Button, Input, Switch } from '../ui';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { Package, Sparkles, ImageIcon, Box, Wrench, Save, X, Loader2 } from 'lucide-react';

interface ProductFormV2Props {
    initialData?: Product;
    onSuccess: () => void;
    onCancel: () => void;
}

export const ProductFormV2: React.FC<ProductFormV2Props> = ({ initialData, onSuccess, onCancel }) => {
    const { t } = useLanguage();

    // Basic Info State
    const [name, setName] = useState(initialData?.name || '');
    const [sku, setSku] = useState(initialData?.sku || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [imageUrl, setImageUrl] = useState(initialData?.image_url || '');
    const [sellingPrice, setSellingPrice] = useState(initialData?.selling_price || 0);
    const [costPrice, setCostPrice] = useState(initialData?.cost_price || 0);
    const [unit, setUnit] = useState(initialData?.unit || 'ชิ้น');
    const [productType, setProductType] = useState<ProductType>(initialData?.product_type || 'tangible');
    const [stockQuantity, setStockQuantity] = useState(initialData?.stock_quantity || 0);

    // Service Flow State
    const [hasServiceFlow, setHasServiceFlow] = useState(initialData?.has_service_flow || false);
    const [lifecycleMonths, setLifecycleMonths] = useState(initialData?.lifecycle_months || 12);
    const [serviceIntervalMonths, setServiceIntervalMonths] = useState(initialData?.service_interval_months || 6);
    const [serviceFlowConfig, setServiceFlowConfig] = useState<ServiceFlowConfig>(
        initialData?.service_flow_config || DEFAULT_SERVICE_FLOW_CONFIG
    );

    // UI State
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

    const handleMagicSetup = async () => {
        if (!name.trim()) {
            setError('กรุณากรอกชื่อสินค้าก่อนใช้ Magic Setup');
            return;
        }

        setAiLoading(true);
        setAiSuggestion(null);

        try {
            const suggestion = await aiSuggestProductConfig(name);
            setLifecycleMonths(suggestion.lifecycle_months);
            setServiceIntervalMonths(suggestion.service_interval_months);
            setHasServiceFlow(true);
            setAiSuggestion(suggestion.reasoning);
        } catch (err) {
            console.error('AI suggestion failed:', err);
            setError('ไม่สามารถใช้ AI แนะนำได้');
        } finally {
            setAiLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const productData: Partial<Product> = {
                name,
                sku: sku || undefined,
                description: description || undefined,
                image_url: imageUrl || undefined,
                selling_price: sellingPrice,
                cost_price: costPrice || undefined,
                unit: unit || undefined,
                product_type: productType,
                stock_quantity: productType === 'tangible' ? stockQuantity : undefined,
                has_service_flow: hasServiceFlow,
                lifecycle_months: hasServiceFlow ? lifecycleMonths : 0,
                service_interval_months: hasServiceFlow ? serviceIntervalMonths : 0,
                service_flow_config: hasServiceFlow ? serviceFlowConfig : DEFAULT_SERVICE_FLOW_CONFIG,
                is_active: true
            };

            if (initialData?.id) {
                await productService.updateProduct(initialData.id, productData);
            } else {
                await productService.createProduct(productData);
            }
            onSuccess();
        } catch (err) {
            console.error(err);
            setError('ไม่สามารถบันทึกสินค้าได้');
        } finally {
            setLoading(false);
        }
    };

    const profitMargin = sellingPrice > 0 && costPrice > 0
        ? ((sellingPrice - costPrice) / sellingPrice * 100).toFixed(1)
        : null;

    return (
        <form onSubmit={handleSubmit} className="h-full overflow-hidden">
            <div className="flex h-full">
                {/* Left Pane - Basic Info (30%) */}
                <div className="w-[35%] border-r dark:border-gray-700 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
                    <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        ข้อมูลสินค้า
                    </h2>

                    {/* Image Preview */}
                    <div className="mb-6">
                        <div className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-xl flex items-center justify-center overflow-hidden">
                            {imageUrl ? (
                                <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                            ) : (
                                <ImageIcon className="w-16 h-16 text-gray-400" />
                            )}
                        </div>
                        <Input
                            className="mt-2"
                            placeholder="URL รูปภาพ"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                        />
                    </div>

                    {/* Product Name with Magic Button */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">ชื่อสินค้า *</label>
                        <div className="flex gap-2">
                            <Input
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="เช่น แอร์ Daikin Inverter 12000 BTU"
                                className="flex-1"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleMagicSetup}
                                disabled={aiLoading}
                                className="shrink-0"
                                title="AI แนะนำการตั้งค่า"
                            >
                                {aiLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Sparkles className="w-4 h-4 text-yellow-500" />
                                )}
                            </Button>
                        </div>
                        {aiSuggestion && (
                            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                {aiSuggestion}
                            </p>
                        )}
                    </div>

                    {/* SKU */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">รหัสสินค้า (SKU)</label>
                        <Input
                            value={sku}
                            onChange={(e) => setSku(e.target.value)}
                            placeholder="เช่น AIR-DK-12K-INV"
                        />
                    </div>

                    {/* Description */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">รายละเอียด</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="รายละเอียดสินค้า..."
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 min-h-[80px]"
                        />
                    </div>

                    {/* Price & Cost */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">ราคาขาย *</label>
                            <Input
                                type="number"
                                required
                                min={0}
                                value={sellingPrice}
                                onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">ราคาทุน</label>
                            <Input
                                type="number"
                                min={0}
                                value={costPrice}
                                onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                            />
                        </div>
                    </div>
                    {profitMargin && (
                        <p className="text-xs text-gray-500 mb-4">
                            กำไร: {(sellingPrice - costPrice).toLocaleString()} บาท ({profitMargin}%)
                        </p>
                    )}

                    {/* Product Type */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">ประเภทสินค้า</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setProductType('tangible')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-colors ${productType === 'tangible'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                                        : 'border-gray-200 dark:border-gray-700'
                                    }`}
                            >
                                <Box className="w-5 h-5" />
                                <span className="text-sm font-medium">สินค้า</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setProductType('service')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-colors ${productType === 'service'
                                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600'
                                        : 'border-gray-200 dark:border-gray-700'
                                    }`}
                            >
                                <Wrench className="w-5 h-5" />
                                <span className="text-sm font-medium">บริการ</span>
                            </button>
                        </div>
                    </div>

                    {/* Stock (only for tangible) */}
                    {productType === 'tangible' && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">จำนวนในสต็อก</label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    min={0}
                                    value={stockQuantity}
                                    onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
                                    className="w-24"
                                />
                                <Input
                                    value={unit}
                                    onChange={(e) => setUnit(e.target.value)}
                                    placeholder="หน่วย"
                                    className="w-20"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Pane - Service Flow (70%) */}
                <div className="w-[65%] overflow-y-auto p-6">
                    {/* Service Flow Toggle */}
                    <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl">
                        <div>
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-yellow-500" />
                                Automation Flow
                            </h2>
                            <p className="text-sm text-gray-500">เปิดใช้ระบบดูแลลูกค้าอัตโนมัติ</p>
                        </div>
                        <Switch
                            checked={hasServiceFlow}
                            onCheckedChange={setHasServiceFlow}
                        />
                    </div>

                    {hasServiceFlow ? (
                        <ServiceFlowBuilder
                            lifecycleMonths={lifecycleMonths}
                            serviceIntervalMonths={serviceIntervalMonths}
                            config={serviceFlowConfig}
                            onConfigChange={setServiceFlowConfig}
                            onLifecycleChange={setLifecycleMonths}
                            onIntervalChange={setServiceIntervalMonths}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-64 text-gray-400">
                            <div className="text-center">
                                <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                <p className="text-lg">เปิด Automation Flow เพื่อตั้งค่าการดูแลลูกค้า</p>
                                <p className="text-sm mt-2">ระบบจะสร้าง Task และส่ง Message อัตโนมัติ</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Actions */}
            <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-700 p-4">
                {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
                <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={onCancel}>
                        <X className="w-4 h-4 mr-1" />
                        ยกเลิก
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-1" />
                        )}
                        {initialData ? 'บันทึกการแก้ไข' : 'สร้างสินค้า'}
                    </Button>
                </div>
            </div>
        </form>
    );
};
