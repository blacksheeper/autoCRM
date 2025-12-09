-- =====================================================
-- SPEC-004: Product Lifecycle Management Migration
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Extend products table with new lifecycle columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type VARCHAR(20) DEFAULT 'tangible';
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_service_flow BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS lifecycle_months INT DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS service_interval_months INT DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS service_flow_config JSONB DEFAULT '{
  "onboarding": { "enabled": true, "task_name": "Install Product", "message_template_id": null },
  "retention": { "enabled": true, "reminder_days_before": 7, "message_template_id": null },
  "maturity": { "enabled": true, "task_name": "Call for MA Renewal", "message_template_id": null }
}'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INT DEFAULT 0;

-- Add constraint for product_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_product_type_check'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_product_type_check 
      CHECK (product_type IN ('tangible', 'service'));
  END IF;
END $$;

-- 2. Create message_templates table
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('onboarding', 'retention', 'maturity')),
  channel VARCHAR(20) DEFAULT 'line' CHECK (channel IN ('line', 'sms', 'email')),
  subject TEXT, -- For email channel
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT ARRAY['customer_name', 'product_name', 'service_date'],
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for message_templates
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- Policies for message_templates
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON message_templates;
CREATE POLICY "Enable read access for authenticated users" ON message_templates 
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON message_templates;
CREATE POLICY "Enable insert access for authenticated users" ON message_templates 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update access for authenticated users" ON message_templates;
CREATE POLICY "Enable update access for authenticated users" ON message_templates 
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON message_templates;
CREATE POLICY "Enable delete access for authenticated users" ON message_templates 
  FOR DELETE USING (auth.role() = 'authenticated');

-- 3. Add snapshot column to customer_products for Snapshot Logic
ALTER TABLE customer_products ADD COLUMN IF NOT EXISTS service_flow_config_snapshot JSONB;
ALTER TABLE customer_products ADD COLUMN IF NOT EXISTS lifecycle_months_snapshot INT;
ALTER TABLE customer_products ADD COLUMN IF NOT EXISTS service_interval_months_snapshot INT;

-- 4. Update trigger to copy service flow config on transaction item creation
CREATE OR REPLACE FUNCTION auto_create_customer_product()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_product products%ROWTYPE;
  v_warranty_days INTEGER;
  v_service_days INTEGER;
BEGIN
  -- Get customer_id from the transaction
  SELECT customer_id INTO v_customer_id 
  FROM transactions 
  WHERE id = NEW.transaction_id;

  -- Get product details
  SELECT * INTO v_product 
  FROM products 
  WHERE id = NEW.product_id;

  -- Calculate dates based on lifecycle_months or usage_duration_days
  IF v_product.lifecycle_months > 0 THEN
    v_warranty_days := v_product.lifecycle_months * 30;
    v_service_days := COALESCE(v_product.service_interval_months, 6) * 30;
  ELSE
    v_warranty_days := COALESCE(v_product.usage_duration_days, 365);
    v_service_days := COALESCE(v_product.usage_duration_days, 30);
  END IF;

  -- Insert customer_product record with snapshot
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
    CURRENT_DATE,
    CURRENT_DATE + v_warranty_days,
    CURRENT_DATE + v_service_days,
    'active',
    v_product.service_flow_config,
    v_product.lifecycle_months,
    v_product.service_interval_months
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Insert default message templates
INSERT INTO message_templates (name, type, channel, content, is_default) VALUES
  ('ยินดีต้อนรับ', 'onboarding', 'line', 
   'สวัสดีคุณ {{customer_name}} 🎉\n\nขอบคุณที่เลือกซื้อ {{product_name}} กับเรา\n\nทีมงานจะติดต่อนัดวันติดตั้งภายใน 24 ชม.\n\n📞 โทร: 02-XXX-XXXX\n📅 รับประกัน {{lifecycle_months}} เดือน', 
   true),
  ('เตือนบริการ', 'retention', 'line', 
   'สวัสดีคุณ {{customer_name}} 🔔\n\nถึงเวลาบำรุงรักษา {{product_name}} แล้ว!\n\n📅 นัดหมายได้ที่: {{service_date}}\n💰 ตรวจเช็คฟรี!', 
   true),
  ('ต่ออายุ MA', 'maturity', 'line', 
   'สวัสดีคุณ {{customer_name}} ⏰\n\nประกันสินค้า {{product_name}} ใกล้หมดแล้ว\n\n🎁 พิเศษ! ต่อ MA รายปีวันนี้ ลด 10%\n📞 โทรจองด่วน!', 
   true)
ON CONFLICT DO NOTHING;

-- 6. Create scheduled_service_tasks table for future task generation
CREATE TABLE IF NOT EXISTS scheduled_service_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID REFERENCES customer_products(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  phase VARCHAR(20) NOT NULL CHECK (phase IN ('onboarding', 'retention', 'maturity')),
  scheduled_date DATE NOT NULL,
  task_name TEXT,
  message_template_id UUID REFERENCES message_templates(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'completed', 'cancelled')),
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for scheduled_service_tasks
ALTER TABLE scheduled_service_tasks ENABLE ROW LEVEL SECURITY;

-- Policies for scheduled_service_tasks
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON scheduled_service_tasks;
CREATE POLICY "Enable read access for authenticated users" ON scheduled_service_tasks 
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON scheduled_service_tasks;
CREATE POLICY "Enable insert access for authenticated users" ON scheduled_service_tasks 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update access for authenticated users" ON scheduled_service_tasks;
CREATE POLICY "Enable update access for authenticated users" ON scheduled_service_tasks 
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON scheduled_service_tasks;
CREATE POLICY "Enable delete access for authenticated users" ON scheduled_service_tasks 
  FOR DELETE USING (auth.role() = 'authenticated');

-- 7. Function to generate scheduled tasks when customer_product is created
CREATE OR REPLACE FUNCTION generate_scheduled_service_tasks()
RETURNS TRIGGER AS $$
DECLARE
  v_config JSONB;
  v_lifecycle INT;
  v_interval INT;
  v_current_month INT;
  v_onboarding_template UUID;
  v_retention_template UUID;
  v_maturity_template UUID;
BEGIN
  -- Get config from snapshot
  v_config := COALESCE(NEW.service_flow_config_snapshot, '{}'::jsonb);
  v_lifecycle := COALESCE(NEW.lifecycle_months_snapshot, 0);
  v_interval := COALESCE(NEW.service_interval_months_snapshot, 0);
  
  -- Skip if no service flow config
  IF v_lifecycle <= 0 OR v_interval <= 0 THEN
    RETURN NEW;
  END IF;
  
  -- Get default templates
  SELECT id INTO v_onboarding_template FROM message_templates WHERE type = 'onboarding' AND is_default = true LIMIT 1;
  SELECT id INTO v_retention_template FROM message_templates WHERE type = 'retention' AND is_default = true LIMIT 1;
  SELECT id INTO v_maturity_template FROM message_templates WHERE type = 'maturity' AND is_default = true LIMIT 1;
  
  -- Generate Onboarding task (Day 0)
  IF (v_config->'onboarding'->>'enabled')::boolean THEN
    INSERT INTO scheduled_service_tasks (customer_product_id, customer_id, phase, scheduled_date, task_name, message_template_id)
    VALUES (NEW.id, NEW.customer_id, 'onboarding', NEW.installation_date, 
            COALESCE(v_config->'onboarding'->>'task_name', 'Install Product'),
            COALESCE((v_config->'onboarding'->>'message_template_id')::uuid, v_onboarding_template));
  END IF;
  
  -- Generate Retention tasks (Loop every interval)
  IF (v_config->'retention'->>'enabled')::boolean THEN
    v_current_month := v_interval;
    WHILE v_current_month < v_lifecycle LOOP
      INSERT INTO scheduled_service_tasks (customer_product_id, customer_id, phase, scheduled_date, task_name, message_template_id)
      VALUES (NEW.id, NEW.customer_id, 'retention', 
              NEW.installation_date + (v_current_month * 30),
              'Service Reminder - Month ' || v_current_month,
              COALESCE((v_config->'retention'->>'message_template_id')::uuid, v_retention_template));
      v_current_month := v_current_month + v_interval;
    END LOOP;
  END IF;
  
  -- Generate Maturity task (End of lifecycle)
  IF (v_config->'maturity'->>'enabled')::boolean THEN
    INSERT INTO scheduled_service_tasks (customer_product_id, customer_id, phase, scheduled_date, task_name, message_template_id)
    VALUES (NEW.id, NEW.customer_id, 'maturity', 
            NEW.installation_date + (v_lifecycle * 30),
            COALESCE(v_config->'maturity'->>'task_name', 'Call for MA Renewal'),
            COALESCE((v_config->'maturity'->>'message_template_id')::uuid, v_maturity_template));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-generating scheduled tasks
DROP TRIGGER IF EXISTS on_customer_product_created_schedule ON customer_products;
CREATE TRIGGER on_customer_product_created_schedule
  AFTER INSERT ON customer_products
  FOR EACH ROW
  EXECUTE FUNCTION generate_scheduled_service_tasks();
