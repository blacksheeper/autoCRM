import React from 'react';
import { FlowPreviewNode } from '../../types';
import { Bell, CheckCircle, Mail, Gift, Wrench } from 'lucide-react';

interface TimelinePreviewProps {
    nodes: FlowPreviewNode[];
    onNodeClick?: (node: FlowPreviewNode) => void;
    purchaseDate?: Date;
}

export const TimelinePreview: React.FC<TimelinePreviewProps> = ({
    nodes,
    onNodeClick,
    purchaseDate = new Date()
}) => {
    const getPhaseIcon = (phase: string) => {
        switch (phase) {
            case 'onboarding':
                return <CheckCircle className="w-5 h-5" />;
            case 'retention':
                return <Wrench className="w-5 h-5" />;
            case 'maturity':
                return <Gift className="w-5 h-5" />;
            default:
                return <Bell className="w-5 h-5" />;
        }
    };

    const getPhaseColor = (phase: string) => {
        switch (phase) {
            case 'onboarding':
                return 'bg-green-500 border-green-500';
            case 'retention':
                return 'bg-blue-500 border-blue-500';
            case 'maturity':
                return 'bg-purple-500 border-purple-500';
            default:
                return 'bg-gray-500 border-gray-500';
        }
    };

    const getPhaseLabel = (phase: string) => {
        switch (phase) {
            case 'onboarding':
                return 'เริ่มต้น';
            case 'retention':
                return 'บำรุงรักษา';
            case 'maturity':
                return 'ต่ออายุ';
            default:
                return phase;
        }
    };

    const formatDate = (monthOffset: number) => {
        const date = new Date(purchaseDate);
        date.setMonth(date.getMonth() + monthOffset);
        return date.toLocaleDateString('th-TH', {
            month: 'short',
            year: 'numeric'
        });
    };

    if (nodes.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 text-gray-400">
                <div className="text-center">
                    <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>กรุณากำหนดระยะเวลาดูแลและรอบบริการ</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gray-200 dark:bg-gray-700" />

            <div className="space-y-4">
                {nodes.map((node, index) => (
                    <div
                        key={`${node.phase}-${node.month}`}
                        className={`relative flex items-start gap-4 p-3 rounded-lg transition-colors
                            ${onNodeClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' : ''}`}
                        onClick={() => onNodeClick?.(node)}
                    >
                        {/* Node icon */}
                        <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full text-white ${getPhaseColor(node.phase)}`}>
                            {getPhaseIcon(node.phase)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full text-white ${getPhaseColor(node.phase)}`}>
                                    {getPhaseLabel(node.phase)}
                                </span>
                                <span className="text-sm text-gray-500">
                                    {node.month === 0 ? 'วันซื้อ' : `เดือนที่ ${node.month}`}
                                </span>
                            </div>
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                {node.action}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                📅 {formatDate(node.month)}
                            </p>
                            {node.customMessage && (
                                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                                    <Mail className="w-3 h-3 inline mr-1" />
                                    {node.customMessage}
                                </p>
                            )}
                        </div>

                        {/* Edit indicator */}
                        {onNodeClick && (
                            <div className="text-gray-400 text-xs">
                                คลิกเพื่อแก้ไข
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// Helper function to generate preview nodes
export function generateFlowPreviewNodes(
    lifecycleMonths: number,
    serviceIntervalMonths: number,
    config: {
        onboarding: { enabled: boolean; task_name: string };
        retention: { enabled: boolean };
        maturity: { enabled: boolean; task_name: string };
    }
): FlowPreviewNode[] {
    const nodes: FlowPreviewNode[] = [];

    if (lifecycleMonths <= 0 || serviceIntervalMonths <= 0) {
        return nodes;
    }

    // Onboarding (Day 0)
    if (config.onboarding.enabled) {
        nodes.push({
            month: 0,
            date: new Date().toISOString(),
            phase: 'onboarding',
            action: config.onboarding.task_name || 'ติดตั้ง/ส่งมอบสินค้า'
        });
    }

    // Retention loop
    if (config.retention.enabled) {
        let currentMonth = serviceIntervalMonths;
        while (currentMonth < lifecycleMonths) {
            nodes.push({
                month: currentMonth,
                date: new Date().toISOString(),
                phase: 'retention',
                action: `เตือนบำรุงรักษา - รอบ ${Math.floor(currentMonth / serviceIntervalMonths)}`
            });
            currentMonth += serviceIntervalMonths;
        }
    }

    // Maturity (End of lifecycle)
    if (config.maturity.enabled) {
        nodes.push({
            month: lifecycleMonths,
            date: new Date().toISOString(),
            phase: 'maturity',
            action: config.maturity.task_name || 'เสนอต่อ MA'
        });
    }

    return nodes;
}
