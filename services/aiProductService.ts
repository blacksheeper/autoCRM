import { GoogleGenAI } from '@google/genai';

// Initialize with API key from environment
const genAI = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

interface AISuggestion {
    lifecycle_months: number;
    service_interval_months: number;
    reasoning: string;
}

export async function aiSuggestProductConfig(productName: string): Promise<AISuggestion> {
    try {
        const prompt = `You are a product lifecycle expert. Based on the product name, suggest appropriate lifecycle and service interval.

Product Name: "${productName}"

Consider:
- Common warranty periods for this type of product
- Typical maintenance/service intervals
- Industry standards

Respond in JSON format only:
{
  "lifecycle_months": <number>,
  "service_interval_months": <number>,
  "reasoning": "<brief explanation in Thai>"
}

Examples:
- Air conditioner: lifecycle_months=24, service_interval_months=6 (ล้างแอร์ทุก 6 เดือน)
- Water filter: lifecycle_months=36, service_interval_months=4 (เปลี่ยนไส้กรองทุก 4 เดือน)
- Car service package: lifecycle_months=12, service_interval_months=3 (เช็คระยะทุก 3 เดือน)`;

        const response = await genAI.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: prompt,
        });

        const text = response.text || '';

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in response');
        }

        const result = JSON.parse(jsonMatch[0]) as AISuggestion;

        // Validate and sanitize
        return {
            lifecycle_months: Math.max(1, Math.min(120, result.lifecycle_months || 12)),
            service_interval_months: Math.max(1, Math.min(24, result.service_interval_months || 6)),
            reasoning: result.reasoning || 'AI แนะนำตาม pattern ทั่วไปของสินค้าประเภทนี้'
        };
    } catch (error) {
        console.error('AI suggestion error:', error);
        // Return sensible defaults on error
        return {
            lifecycle_months: 12,
            service_interval_months: 6,
            reasoning: 'ไม่สามารถวิเคราะห์ได้ ใช้ค่าเริ่มต้น (รับประกัน 1 ปี, บริการทุก 6 เดือน)'
        };
    }
}
