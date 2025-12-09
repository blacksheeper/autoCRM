import React, { useEffect, useState } from 'react';
import { productService } from '../services/productService';
import { Product } from '../types';
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from './ui';
import { Plus, Search, Filter, MoreHorizontal, ArrowUpDown, Package, Trash2, Upload, Sparkles, Box, Wrench } from 'lucide-react';
import { ProductFormV2 } from './product';
import { useLanguage } from '../src/contexts/LanguageContext';

export const ProductList: React.FC = () => {
    const { t } = useLanguage();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const data = await productService.getProducts();
            setProducts(data);
        } catch (err) {
            console.error('Error fetching products:', err);
            setError(t('failedToLoadProducts'));
        } finally {
            setLoading(false);
        }
    };

    const handleAddClick = () => {
        setEditingProduct(undefined);
        setIsModalOpen(true);
    };

    const handleEditClick = (product: Product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleFormSuccess = () => {
        setIsModalOpen(false);
        fetchProducts();
    };

    const handleImportClick = () => {
        document.getElementById('product-csv-upload')?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            if (!text) return;

            const lines = text.split('\n');
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

            let successCount = 0;
            let failCount = 0;

            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;

                const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                const productData: any = {};

                headers.forEach((header, index) => {
                    if (header === 'Name') productData.name = values[index];
                    if (header === 'Selling Price') productData.selling_price = parseFloat(values[index]);
                    if (header === 'Cost Price') productData.cost_price = parseFloat(values[index]);
                    if (header === 'Unit') productData.unit = values[index];
                    if (header === 'Usage Duration') productData.usage_duration_days = parseInt(values[index]);
                });

                if (productData.name && productData.selling_price) {
                    try {
                        await productService.createProduct(productData);
                        successCount++;
                    } catch (err) {
                        console.error('Failed to import row', i, err);
                        failCount++;
                    }
                }
            }

            alert(t('importFinished').replace('{success}', successCount.toString()).replace('{fail}', failCount.toString()));
            fetchProducts();
            event.target.value = '';
        };
        reader.readAsText(file);
    };

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading && products.length === 0) return <div className="p-8 text-center">{t('loadingProducts')}</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{t('productsTitle')}</h2>
                    <p className="text-sm text-gray-500 mt-1">{t('productsDesc')}</p>
                </div>
                <div className="flex gap-2">
                    <input
                        type="file"
                        id="product-csv-upload"
                        accept=".csv"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    <Button variant="outline" onClick={handleImportClick}>
                        <Upload className="w-4 h-4 mr-2" />
                        {t('import')}
                    </Button>
                    <Button onClick={handleAddClick}>
                        <Plus className="w-4 h-4 mr-2" />
                        {t('addProduct')}
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="border-b border-gray-100 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder={t('searchProducts')}
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
                            <Button variant="outline" size="sm" className="hidden sm:flex">
                                <ArrowUpDown className="w-4 h-4 mr-2" />
                                {t('sort')}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('productName')}</TableHead>
                                <TableHead>ประเภท</TableHead>
                                <TableHead>{t('sellingPrice')}</TableHead>
                                <TableHead>{t('costPrice')}</TableHead>
                                <TableHead>Service Flow</TableHead>
                                <TableHead className="w-[100px] text-right">{t('actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <tbody>
                            {filteredProducts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-gray-500" >
                                        <div className="flex flex-col items-center justify-center">
                                            <Package className="w-12 h-12 text-gray-300 mb-2" />
                                            <p>{t('noProductsFound')}</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredProducts.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                {product.image_url ? (
                                                    <img
                                                        src={product.image_url}
                                                        alt={product.name}
                                                        className="w-10 h-10 rounded-lg object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                                        <Package className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-white">
                                                        {product.name}
                                                    </div>
                                                    {product.sku && (
                                                        <div className="text-xs text-gray-500">{product.sku}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${product.product_type === 'service'
                                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                }`}>
                                                {product.product_type === 'service' ? (
                                                    <><Wrench className="w-3 h-3" /> บริการ</>
                                                ) : (
                                                    <><Box className="w-3 h-3" /> สินค้า</>
                                                )}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            ฿{product.selling_price?.toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            ฿{product.cost_price?.toLocaleString() ?? '-'}
                                        </TableCell>
                                        <TableCell>
                                            {product.has_service_flow ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                                    <Sparkles className="w-3 h-3" />
                                                    {product.lifecycle_months} เดือน
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-sm">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="sm" className="h-10 w-10 p-0" onClick={() => handleEditClick(product)}>
                                                    <MoreHorizontal className="w-5 h-5" />
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-10 w-10 p-0" onClick={() => {
                                                    if (window.confirm(t('deleteProductConfirm'))) {
                                                        productService.deleteProduct(product.id).then(() => fetchProducts());
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

            {/* Full-screen modal for ProductFormV2 */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-6xl h-[90vh] p-0 overflow-hidden">
                    <DialogHeader className="px-6 py-4 border-b dark:border-gray-700">
                        <DialogTitle className="flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            {editingProduct ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="h-[calc(100%-8rem)] overflow-hidden relative">
                        <ProductFormV2
                            initialData={editingProduct}
                            onSuccess={handleFormSuccess}
                            onCancel={() => setIsModalOpen(false)}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
