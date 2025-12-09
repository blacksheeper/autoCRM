import React, { useState, useEffect } from 'react';
import { ServiceFlowConfig, MessageTemplate, DEFAULT_SERVICE_FLOW_CONFIG, FlowPreviewNode } from '../../types';
import { messageTemplateService } from '../../services/messageTemplateService';
import { TimelinePreview, generateFlowPreviewNodes } from './TimelinePreview';
import { Switch, Button, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui';
import { Zap, Settings, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

interface ServiceFlowBuilderProps {
    lifecycleMonths: number;
    serviceIntervalMonths: number;
    config: ServiceFlowConfig;
    onConfigChange: (config: ServiceFlowConfig) => void;
    onLifecycleChange: (months: number) => void;
    onIntervalChange: (months: number) => void;
}

export const ServiceFlowBuilder: React.FC<ServiceFlowBuilderProps> = ({
    lifecycleMonths,
    serviceIntervalMonths,
    config,
    onConfigChange,
    onLifecycleChange,
    onIntervalChange
}) => {
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [expandedPhase, setExpandedPhase] = useState<string | null>('onboarding');
    const [previewNodes, setPreviewNodes] = useState<FlowPreviewNode[]>([]);

    useEffect(() => {
        loadTemplates();
    }, []);

    useEffect(() => {
        const nodes = generateFlowPreviewNodes(lifecycleMonths, serviceIntervalMonths, config);
        setPreviewNodes(nodes);
    }, [lifecycleMonths, serviceIntervalMonths, config]);

    const loadTemplates = async () => {
        try {
            const data = await messageTemplateService.getTemplates();
            setTemplates(data);
        } catch (error) {
            console.error('Error loading templates:', error);
        }
    };

    const updatePhaseConfig = (phase: 'onboarding' | 'retention' | 'maturity', updates: Partial<ServiceFlowConfig[typeof phase]>) => {
        onConfigChange({
            ...config,
            [phase]: { ...config[phase], ...updates }
        });
    };

    const togglePhase = (phase: string) => {
        setExpandedPhase(expandedPhase === phase ? null : phase);
    };

    const getTemplatesByType = (type: string) => {
        return templates.filter(t => t.type === type);
    };

    return (
        <div className="space-y-6">
            {/* Time Configuration */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    ตั้งค่าระยะเวลา
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            ระยะเวลาดูแล/รับประกัน
                        </label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                min={0}
                                value={lifecycleMonths}
                                onChange={(e) => onLifecycleChange(parseInt(e.target.value) || 0)}
                                className="w-24"
                            />
                            <span className="text-sm text-gray-500">เดือน</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            รอบบริการ
                        </label>
                        <div className="flex items-center gap-2">
                            <select
                                value={serviceIntervalMonths}
                                onChange={(e) => onIntervalChange(parseInt(e.target.value))}
                                className="px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
                            >
                                <option value={1}>ทุก 1 เดือน</option>
                                <option value={3}>ทุก 3 เดือน</option>
                                <option value={6}>ทุก 6 เดือน</option>
                                <option value={12}>ทุก 1 ปี</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Phase Configurations */}
            <div className="space-y-3">
                {/* Phase 1: Onboarding */}
                <div className="border rounded-xl overflow-hidden dark:border-gray-700">
                    <div
                        className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 cursor-pointer"
                        onClick={() => togglePhase('onboarding')}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">
                                1
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">Onboarding</h4>
                                <p className="text-xs text-gray-500">เริ่มต้นหลังการขาย (Day 0)</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Switch
                                checked={config.onboarding.enabled}
                                onCheckedChange={(checked) => updatePhaseConfig('onboarding', { enabled: checked })}
                                onClick={(e) => e.stopPropagation()}
                            />
                            {expandedPhase === 'onboarding' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                    </div>
                    {expandedPhase === 'onboarding' && config.onboarding.enabled && (
                        <div className="p-4 space-y-4 bg-white dark:bg-gray-800">
                            <div>
                                <label className="block text-sm font-medium mb-1">ชื่อ Task</label>
                                <Input
                                    value={config.onboarding.task_name}
                                    onChange={(e) => updatePhaseConfig('onboarding', { task_name: e.target.value })}
                                    placeholder="เช่น ติดตั้งสินค้า"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Template ข้อความ</label>
                                <select
                                    value={config.onboarding.message_template_id || ''}
                                    onChange={(e) => updatePhaseConfig('onboarding', { message_template_id: e.target.value || null })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="">-- เลือก Template --</option>
                                    {getTemplatesByType('onboarding').map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Phase 2: Retention */}
                <div className="border rounded-xl overflow-hidden dark:border-gray-700">
                    <div
                        className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 cursor-pointer"
                        onClick={() => togglePhase('retention')}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
                                2
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">Retention Loop</h4>
                                <p className="text-xs text-gray-500">เตือนบริการตามรอบ</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Switch
                                checked={config.retention.enabled}
                                onCheckedChange={(checked) => updatePhaseConfig('retention', { enabled: checked })}
                                onClick={(e) => e.stopPropagation()}
                            />
                            {expandedPhase === 'retention' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                    </div>
                    {expandedPhase === 'retention' && config.retention.enabled && (
                        <div className="p-4 space-y-4 bg-white dark:bg-gray-800">
                            <div>
                                <label className="block text-sm font-medium mb-1">เตือนล่วงหน้า (วัน)</label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={config.retention.reminder_days_before}
                                    onChange={(e) => updatePhaseConfig('retention', { reminder_days_before: parseInt(e.target.value) || 7 })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Template ข้อความ</label>
                                <select
                                    value={config.retention.message_template_id || ''}
                                    onChange={(e) => updatePhaseConfig('retention', { message_template_id: e.target.value || null })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="">-- เลือก Template --</option>
                                    {getTemplatesByType('retention').map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Phase 3: Maturity */}
                <div className="border rounded-xl overflow-hidden dark:border-gray-700">
                    <div
                        className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 cursor-pointer"
                        onClick={() => togglePhase('maturity')}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold">
                                3
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">Maturity / Renewal</h4>
                                <p className="text-xs text-gray-500">สิ้นสุดประกัน</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Switch
                                checked={config.maturity.enabled}
                                onCheckedChange={(checked) => updatePhaseConfig('maturity', { enabled: checked })}
                                onClick={(e) => e.stopPropagation()}
                            />
                            {expandedPhase === 'maturity' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                    </div>
                    {expandedPhase === 'maturity' && config.maturity.enabled && (
                        <div className="p-4 space-y-4 bg-white dark:bg-gray-800">
                            <div>
                                <label className="block text-sm font-medium mb-1">ชื่อ Task</label>
                                <Input
                                    value={config.maturity.task_name}
                                    onChange={(e) => updatePhaseConfig('maturity', { task_name: e.target.value })}
                                    placeholder="เช่น โทรเสนอต่อ MA"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Template ข้อความ</label>
                                <select
                                    value={config.maturity.message_template_id || ''}
                                    onChange={(e) => updatePhaseConfig('maturity', { message_template_id: e.target.value || null })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="">-- เลือก Template --</option>
                                    {getTemplatesByType('maturity').map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Timeline Preview */}
            <div className="border rounded-xl p-4 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    Preview Timeline
                </h3>
                <TimelinePreview
                    nodes={previewNodes}
                    onNodeClick={(node) => {
                        // Open phase editor for clicked node
                        setExpandedPhase(node.phase);
                    }}
                />
            </div>
        </div>
    );
};
