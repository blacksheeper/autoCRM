import React, { useState, useEffect, useRef } from 'react';
import { Customer } from '../../types';
import { customerService } from '../../services/customerService';
import { transactionService } from '../../services/transactionService';
import { Input, Badge } from '../ui';
import { Search, User, Phone, Crown, AlertTriangle, Plus } from 'lucide-react';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { QuickAddCustomerModal } from './QuickAddCustomerModal';

interface CustomerSelectorProps {
    selectedCustomer: Customer | null;
    onSelect: (customer: Customer) => void;
    selectedProductIds?: string[]; // For duplicate warning check
}

interface DuplicateWarning {
    productName: string;
    daysSince: number;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
    selectedCustomer,
    onSelect,
    selectedProductIds = []
}) => {
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [duplicateWarnings, setDuplicateWarnings] = useState<DuplicateWarning[]>([]);
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchCustomers();
    }, []);

    useEffect(() => {
        // Click outside to close dropdown
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        // Filter customers based on search term
        if (searchTerm.length === 0) {
            setFilteredCustomers(customers.slice(0, 10));
        } else {
            const term = searchTerm.toLowerCase();
            const filtered = customers.filter(c =>
                c.first_name?.toLowerCase().includes(term) ||
                c.last_name?.toLowerCase().includes(term) ||
                c.phone?.includes(term) ||
                c.nickname?.toLowerCase().includes(term) ||
                c.line_user_id?.toLowerCase().includes(term)
            ).slice(0, 10);
            setFilteredCustomers(filtered);
        }
    }, [searchTerm, customers]);

    useEffect(() => {
        // Check for duplicate purchases when customer and products are selected
        if (selectedCustomer && selectedProductIds.length > 0) {
            checkDuplicatePurchases();
        } else {
            setDuplicateWarnings([]);
        }
    }, [selectedCustomer, selectedProductIds]);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const data = await customerService.getCustomers();
            setCustomers(data);
            setFilteredCustomers(data.slice(0, 10));
        } catch (error) {
            console.error('Failed to fetch customers:', error);
        } finally {
            setLoading(false);
        }
    };

    const checkDuplicatePurchases = async () => {
        if (!selectedCustomer) return;

        try {
            const transactions = await transactionService.getTransactionsByCustomerId(selectedCustomer.id);
            const warnings: DuplicateWarning[] = [];
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            transactions.forEach(trans => {
                const transDate = new Date(trans.transaction_date);
                if (transDate >= sevenDaysAgo && trans.items) {
                    trans.items.forEach(item => {
                        if (selectedProductIds.includes(item.product_id)) {
                            const daysSince = Math.floor((Date.now() - transDate.getTime()) / (1000 * 60 * 60 * 24));
                            warnings.push({
                                productName: item.product_name || 'สินค้า',
                                daysSince
                            });
                        }
                    });
                }
            });

            setDuplicateWarnings(warnings);
        } catch (error) {
            console.error('Failed to check duplicate purchases:', error);
        }
    };

    const handleSelectCustomer = (customer: Customer) => {
        onSelect(customer);
        setIsDropdownOpen(false);
        setSearchTerm('');
    };

    const handleSearchFocus = () => {
        setIsDropdownOpen(true);
    };

    const handleClearSelection = () => {
        onSelect(null as unknown as Customer);
        setDuplicateWarnings([]);
    };

    const handleQuickAddSuccess = (newCustomer: Customer) => {
        setCustomers([newCustomer, ...customers]);
        handleSelectCustomer(newCustomer);
        setShowQuickAdd(false);
    };

    const getTierBadge = (tier?: string) => {
        switch (tier) {
            case 'Platinum':
                return <Badge variant="default" className="bg-gradient-to-r from-purple-600 to-pink-600"><Crown className="w-3 h-3 mr-1" />Platinum</Badge>;
            case 'Gold':
                return <Badge variant="default" className="bg-gradient-to-r from-yellow-500 to-orange-500"><Crown className="w-3 h-3 mr-1" />Gold</Badge>;
            case 'Silver':
                return <Badge variant="default" className="bg-gradient-to-r from-gray-400 to-gray-500">Silver</Badge>;
            default:
                return <Badge variant="outline">Standard</Badge>;
        }
    };

    // Display selected customer card
    if (selectedCustomer) {
        return (
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t('customer')}</label>
                <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50 relative">
                    <button
                        onClick={handleClearSelection}
                        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-sm"
                    >
                        ✕ {t('change') || 'เปลี่ยน'}
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                            {selectedCustomer.first_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">
                                    {selectedCustomer.first_name} {selectedCustomer.last_name}
                                </span>
                                {getTierBadge(selectedCustomer.tier)}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {selectedCustomer.phone || '-'}
                                </span>
                                {selectedCustomer.total_transactions > 0 && (
                                    <span>
                                        ซื้อแล้ว {selectedCustomer.total_transactions} ครั้ง
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Duplicate Purchase Warning */}
                    {duplicateWarnings.length > 0 && (
                        <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded-md">
                            <div className="flex items-start gap-2 text-yellow-800 text-sm">
                                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-medium">⚠️ เตือน: ซื้อซ้ำภายใน 7 วัน</p>
                                    {duplicateWarnings.map((w, i) => (
                                        <p key={i}>• {w.productName} เมื่อ {w.daysSince} วันที่แล้ว</p>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Search input with dropdown
    return (
        <div className="space-y-2" ref={dropdownRef}>
            <label className="text-sm font-medium text-gray-700">{t('customer')}</label>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                    placeholder={t('searchCustomerPlaceholder') || 'ค้นหาลูกค้า (ชื่อ, เบอร์โทร, LINE...)'}
                    className="pl-10 h-12 text-lg"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={handleSearchFocus}
                />

                {/* Dropdown */}
                {isDropdownOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-80 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-gray-500">กำลังโหลด...</div>
                        ) : filteredCustomers.length > 0 ? (
                            <>
                                {filteredCustomers.map((customer) => (
                                    <div
                                        key={customer.id}
                                        className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 flex items-center gap-3"
                                        onClick={() => handleSelectCustomer(customer)}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-600 font-medium">
                                            {customer.first_name?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">
                                                    {customer.first_name} {customer.last_name}
                                                </span>
                                                {customer.tier && customer.tier !== 'Standard' && getTierBadge(customer.tier)}
                                            </div>
                                            <div className="text-sm text-gray-500 flex items-center gap-2">
                                                <Phone className="w-3 h-3" />
                                                {customer.phone || '-'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <div className="p-4 text-center text-gray-500">
                                ไม่พบลูกค้า
                            </div>
                        )}

                        {/* Quick Add Button */}
                        <div
                            className="p-3 bg-blue-50 hover:bg-blue-100 cursor-pointer flex items-center gap-2 text-blue-600 font-medium border-t"
                            onClick={() => {
                                setShowQuickAdd(true);
                                setIsDropdownOpen(false);
                            }}
                        >
                            <Plus className="w-5 h-5" />
                            + เพิ่มลูกค้าใหม่
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Add Modal */}
            <QuickAddCustomerModal
                isOpen={showQuickAdd}
                onClose={() => setShowQuickAdd(false)}
                onSuccess={handleQuickAddSuccess}
                defaultPhone={searchTerm.match(/^\d+$/) ? searchTerm : ''}
                defaultName={!searchTerm.match(/^\d+$/) ? searchTerm : ''}
            />
        </div>
    );
};
