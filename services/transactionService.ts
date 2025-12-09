import { supabase } from '../lib/supabase';
import { Transaction, TransactionItem } from '../types';
import { automationEngine } from './automationEngine';

export const transactionService = {
    async getTransactions() {
        const { data, error } = await supabase
            .from('transactions')
            .select(`
        *,
        customer:customers (first_name, last_name)
      `)
            .order('transaction_date', { ascending: false });

        if (error) throw error;
        return data as Transaction[];
    },

    async getTransactionsByCustomerId(customerId: string) {
        const { data, error } = await supabase
            .from('transactions')
            .select(`
        *,
        items:transaction_items (
          *,
          product:products (name)
        )
      `)
            .eq('customer_id', customerId)
            .order('transaction_date', { ascending: false });

        if (error) throw error;
        return data as Transaction[];
    },

    async getTransaction(id: string) {
        const { data, error } = await supabase
            .from('transactions')
            .select(`
        *,
        customer:customers (*),
        items:transaction_items (
          *,
          product:products (name)
        )
      `)
            .eq('id', id)
            .single();

        if (error) throw error;

        // Flatten product name into item for easier consumption if needed
        const formattedData = {
            ...data,
            items: data.items.map((item: any) => ({
                ...item,
                product_name: item.product?.name
            }))
        };

        return formattedData as Transaction;
    },

    async createTransaction(transaction: Partial<Transaction>, items: Partial<TransactionItem>[]) {
        // 1. Create Transaction
        const { data: transData, error: transError } = await supabase
            .from('transactions')
            .insert([transaction])
            .select()
            .single();

        if (transError) throw transError;

        // 2. Create Items with service flow fields
        if (items.length > 0) {
            const itemsWithTransId = items.map(item => ({
                transaction_id: transData.id,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price,
                enable_service_flow: item.enable_service_flow || false,
                service_start_date: item.service_start_date || null
            }));

            const { error: itemsError } = await supabase
                .from('transaction_items')
                .insert(itemsWithTransId);

            if (itemsError) {
                console.error('Error creating items', itemsError);
                // In a real app, we would delete the transaction here to rollback
                throw itemsError;
            }

            // 3. Auto-generate Tasks (Refill Reminders)
            // We need to fetch product details to get usage_duration_days
            // Optimization: We could have passed full product objects, but let's fetch to be safe/clean
            const productIds = items.map(i => i.product_id);
            const { data: products } = await supabase
                .from('products')
                .select('id, name, usage_duration_days')
                .in('id', productIds);

            if (products) {
                const tasksToCreate: any[] = [];
                items.forEach(item => {
                    const product = products.find(p => p.id === item.product_id);
                    if (product && product.usage_duration_days) {
                        const daysToAdd = product.usage_duration_days * (item.quantity || 1);
                        const dueDate = new Date();
                        dueDate.setDate(dueDate.getDate() + daysToAdd);

                        tasksToCreate.push({
                            title: `Refill Reminder: ${product.name}`,
                            type: 'Call', // Default to Call or LINE
                            status: 'Pending',
                            due_date: dueDate.toISOString(),
                            customer_id: transaction.customer_id
                        });
                    }
                });

                if (tasksToCreate.length > 0) {
                    await supabase.from('tasks').insert(tasksToCreate);
                }
            }
        }

        // Trigger Automation
        try {
            await automationEngine.startJourney('new_transaction', { ...transData, items });
        } catch (err) {
            console.error('Failed to trigger automation:', err);
        }

        return transData as Transaction;
    },

    async deleteTransaction(id: string) {
        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async updateTransaction(id: string, transaction: Partial<Transaction>, items: Partial<TransactionItem>[]) {
        // 1. Update Transaction Details
        const { error: transError } = await supabase
            .from('transactions')
            .update(transaction)
            .eq('id', id);

        if (transError) throw transError;

        // 2. Delete existing items
        const { error: deleteError } = await supabase
            .from('transaction_items')
            .delete()
            .eq('transaction_id', id);

        if (deleteError) throw deleteError;

        // 3. Insert new items
        if (items.length > 0) {
            const itemsWithTransId = items.map(item => ({
                transaction_id: id,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price
            }));

            const { error: itemsError } = await supabase
                .from('transaction_items')
                .insert(itemsWithTransId);

            if (itemsError) throw itemsError;
        }
    }
};
