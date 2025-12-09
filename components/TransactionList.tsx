import React, { useEffect, useState } from 'react';
import { transactionService } from '../services/transactionService';
import { Transaction } from '../types';
import {
    Table,
    TableHeader,
    TableRow,
    TableHead,
    TableCell,
    Card,
    CardHeader,
    CardContent,
    Button,
    Input,
    Badge,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from './ui';
import { Plus, Search, Filter, Trash2, MoreHorizontal, Package } from 'lucide-react';
import { TransactionFormV2 } from './transaction/TransactionFormV2';
import { useLanguage } from '../src/contexts/LanguageContext';

export const TransactionList: React.FC = () => {
    const { t } = useLanguage();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const data = await transactionService.getTransactions();
            setTransactions(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddClick = () => {
        setEditingTransaction(undefined);
        setIsModalOpen(true);
    };

    const handleEditClick = (transaction: Transaction) => {
        setEditingTransaction(transaction);
        setIsModalOpen(true);
    };

    const filteredTransactions = transactions.filter(t =>
        t.customer?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.customer?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">{t('transactionsTitle')}</h2>
                    <p className="text-sm text-gray-500 mt-1">{t('transactionsDesc')}</p>
                </div>
                <Button onClick={handleAddClick}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('newTransaction')}
                </Button>
            </div>

            <Card>
                <CardHeader className="border-b border-gray-100 bg-white/50">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder={t('searchTransactions')}
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 ml-auto">
                            <Button variant="outline" size="sm" className="hidden sm:flex">
                                <Filter className="w-4 h-4 mr-2" />
                                {t('filter')}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('customer')}</TableHead>
                                <TableHead>{t('date')}</TableHead>
                                <TableHead>{t('amount')}</TableHead>
                                <TableHead>{t('status')}</TableHead>
                                <TableHead className="w-[100px] text-right">{t('actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <tbody>
                            {filteredTransactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <Package className="w-12 h-12 text-gray-300 mb-2" />
                                            <p>{t('noTransactionsFound')}</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTransactions.map((t) => (
                                    <TableRow key={t.id}>
                                        <TableCell>
                                            <div className="font-medium text-gray-900">
                                                {t.customer ? `${t.customer.first_name} ${t.customer.last_name}` : 'Unknown'}
                                            </div>
                                            <div className="text-xs text-gray-500 font-mono mt-0.5">
                                                {t.id.slice(0, 8)}...
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(t.transaction_date).toLocaleDateString('th-TH', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </TableCell>
                                        <TableCell>
                                            ฿{t.total_amount.toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={t.status === 'completed' ? 'success' : 'warning'}>
                                                {t.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="sm" className="h-10 w-10 p-0" onClick={() => handleEditClick(t)}>
                                                    <MoreHorizontal className="w-5 h-5" />
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-10 w-10 p-0" onClick={() => {
                                                    if (window.confirm('Are you sure you want to delete this transaction?')) {
                                                        transactionService.deleteTransaction(t.id).then(() => fetchTransactions());
                                                    }
                                                }}>
                                                    <Trash2 className="w-5 h-5 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </tbody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingTransaction ? 'Edit Transaction' : t('newTransaction')}</DialogTitle>
                    </DialogHeader>
                    <TransactionFormV2
                        initialData={editingTransaction}
                        onSuccess={() => {
                            setIsModalOpen(false);
                            fetchTransactions();
                        }}
                        onCancel={() => setIsModalOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
};
