-- =====================================================
-- SPEC-005: Transaction & Order Management Migration
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Extend transactions table with new columns
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_no TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS net_amount NUMERIC DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_slip_url TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS send_line_notification BOOLEAN DEFAULT FALSE;

-- Add payment_status with constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE transactions ADD COLUMN payment_status VARCHAR(20) DEFAULT 'Paid';
    ALTER TABLE transactions ADD CONSTRAINT transactions_payment_status_check 
      CHECK (payment_status IN ('Pending', 'Paid', 'Cancelled'));
  END IF;
END $$;

-- 2. Extend transaction_items table
ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS enable_service_flow BOOLEAN DEFAULT FALSE;
ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS service_start_date DATE;
ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- 3. Add VAT settings to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS enable_vat BOOLEAN DEFAULT TRUE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vat_rate NUMERIC DEFAULT 7;

-- 4. Create function to generate transaction number (includes Customer ID)
CREATE OR REPLACE FUNCTION generate_transaction_number()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_prefix TEXT;
  v_prefix TEXT;
  v_count INT;
  v_number TEXT;
BEGIN
  -- Get short customer ID (first 6 chars uppercase)
  v_customer_prefix := UPPER(LEFT(NEW.customer_id::TEXT, 6));
  v_prefix := 'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || v_customer_prefix || '-';
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM transactions
  WHERE transaction_no LIKE v_prefix || '%';
  
  v_number := v_prefix || LPAD(v_count::TEXT, 3, '0');
  NEW.transaction_no := v_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating transaction number
DROP TRIGGER IF EXISTS on_transaction_generate_number ON transactions;
CREATE TRIGGER on_transaction_generate_number
  BEFORE INSERT ON transactions
  FOR EACH ROW
  WHEN (NEW.transaction_no IS NULL)
  EXECUTE FUNCTION generate_transaction_number();

-- 5. Update auto_create_customer_product to use service_start_date
CREATE OR REPLACE FUNCTION auto_create_customer_product_v2()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_product products%ROWTYPE;
  v_warranty_days INTEGER;
  v_install_date DATE;
BEGIN
  -- Get customer_id from the transaction
  SELECT customer_id INTO v_customer_id 
  FROM transactions 
  WHERE id = NEW.transaction_id;

  -- Get product details
  SELECT * INTO v_product 
  FROM products 
  WHERE id = NEW.product_id;

  -- Use service_start_date if provided, otherwise use current date
  v_install_date := COALESCE(NEW.service_start_date, CURRENT_DATE);

  -- Calculate warranty end based on lifecycle_months or usage_duration_days
  IF v_product.lifecycle_months > 0 THEN
    v_warranty_days := v_product.lifecycle_months * 30;
  ELSE
    v_warranty_days := COALESCE(v_product.usage_duration_days, 365);
  END IF;

  -- Only create customer_product if it's a tangible product
  IF v_product.product_type = 'tangible' OR v_product.product_type IS NULL THEN
    INSERT INTO customer_products (
      customer_id,
      product_id,
      transaction_id,
      transaction_item_id,
      quantity,
      installation_date,
      warranty_end_date,
      next_service_date,
      status,
      service_flow_config_snapshot,
      lifecycle_months_snapshot,
      service_interval_months_snapshot
    ) VALUES (
      v_customer_id,
      NEW.product_id,
      NEW.transaction_id,
      NEW.id,
      NEW.quantity,
      v_install_date,
      v_install_date + v_warranty_days,
      v_install_date + (COALESCE(v_product.service_interval_months, 6) * 30),
      'active',
      v_product.service_flow_config,
      v_product.lifecycle_months,
      v_product.service_interval_months
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace old trigger with new one
DROP TRIGGER IF EXISTS on_transaction_item_created ON transaction_items;
CREATE TRIGGER on_transaction_item_created
  AFTER INSERT ON transaction_items
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_customer_product_v2();

-- 6. Create index for faster duplicate check (customer bought same product recently)
CREATE INDEX IF NOT EXISTS idx_transactions_customer_date 
ON transactions(customer_id, transaction_date);

CREATE INDEX IF NOT EXISTS idx_transaction_items_product 
ON transaction_items(product_id);

-- 7. Update trigger for activity log to use new fields
CREATE OR REPLACE FUNCTION auto_create_activity_log_from_transaction_v2()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_logs (
    customer_id,
    type,
    title,
    description,
    amount,
    metadata
  ) VALUES (
    NEW.customer_id,
    'order',
    'ซื้อสินค้า #' || COALESCE(NEW.transaction_no, LEFT(NEW.id::TEXT, 8)),
    'สร้างรายการซื้อใหม่',
    NEW.total_amount,
    jsonb_build_object(
      'transaction_id', NEW.id, 
      'transaction_no', NEW.transaction_no,
      'payment_method', NEW.payment_method,
      'payment_status', NEW.payment_status
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace old trigger 
DROP TRIGGER IF EXISTS on_transaction_created_log ON transactions;
CREATE TRIGGER on_transaction_created_log
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_activity_log_from_transaction_v2();
