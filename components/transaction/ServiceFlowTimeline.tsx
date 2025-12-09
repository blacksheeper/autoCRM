import React from 'react';
import { Product, FlowPreviewNode } from '../../types';
import { CalendarDays, Wrench, Phone, CheckCircle2 } from 'lucide-react';

interface ServiceFlowTimelineProps {
    product: Product;
    serviceStartDate: Date;
    compact?: boolean;
}

export const ServiceFlowTimeline: React.FC<ServiceFlowTimelineProps> = ({
    product,
    serviceStartDate,
    compact = false
}) => {
    // Generate timeline nodes based on product configuration
    const generateTimelineNodes = (): FlowPreviewNode[] => {
        const nodes: FlowPreviewNode[] = [];
        const { lifecycle_months, service_interval_months, service_flow_config } = product;

        if (!lifecycle_months || lifecycle_months <= 0) return nodes;

        // Onboarding (Day 0)
        if (service_flow_config?.onboarding?.enabled) {
            const date = new Date(serviceStartDate);
            nodes.push({
                month: 0,
                date: formatDate(date),
                phase: 'onboarding',
                action: service_flow_config.onboarding.task_name || 'ติดตั้ง',
                customMessage: undefined
            });
        }

        // Retention (Loop every service_interval_months)
        if (service_flow_config?.retention?.enabled && service_interval_months > 0) {
            let currentMonth = service_interval_months;
            while (currentMonth < lifecycle_months) {
                const date = new Date(serviceStartDate);
                date.setMonth(date.getMonth() + currentMonth);
                nodes.push({
                    month: currentMonth,
                    date: formatDate(date),
                    phase: 'retention',
                    action: `ล้าง/บำรุง`,
                    customMessage: undefined
                });
                currentMonth += service_interval_months;
            }
        }

        // Maturity (End of lifecycle)
        if (service_flow_config?.maturity?.enabled) {
            const date = new Date(serviceStartDate);
            date.setMonth(date.getMonth() + lifecycle_months);
            nodes.push({
                month: lifecycle_months,
                date: formatDate(date),
                phase: 'maturity',
                action: service_flow_config.maturity.task_name || 'ต่อ MA',
                customMessage: undefined
            });
        }

        return nodes;
    };

    const formatDate = (date: Date): string => {
        return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
    };

    const getPhaseIcon = (phase: string) => {
        switch (phase) {
            case 'onboarding':
                return <Wrench className="w-3 h-3" />;
            case 'retention':
                return <CalendarDays className="w-3 h-3" />;
            case 'maturity':
                return <Phone className="w-3 h-3" />;
            default:
                return <CheckCircle2 className="w-3 h-3" />;
        }
    };

    const getPhaseColor = (phase: string) => {
        switch (phase) {
            case 'onboarding':
                return 'bg-green-500';
            case 'retention':
                return 'bg-blue-500';
            case 'maturity':
                return 'bg-orange-500';
            default:
                return 'bg-gray-500';
        }
    };

    const nodes = generateTimelineNodes();

    if (nodes.length === 0) {
        return null;
    }

    // Compact view (horizontal)
    if (compact) {
        return (
            <div className="flex items-center gap-1 text-xs overflow-x-auto pb-1">
                {nodes.map((node, index) => (
                    <React.Fragment key={index}>
                        <div className="flex items-center gap-1 whitespace-nowrap">
                            <span className={`w-2 h-2 rounded-full ${getPhaseColor(node.phase)}`} />
                            <span className="text-gray-600">
                                {node.month === 0 ? 'Day0' : `M${node.month}`}
                            </span>
                        </div>
                        {index < nodes.length - 1 && (
                            <span className="text-gray-300">→</span>
                        )}
                    </React.Fragment>
                ))}
            </div>
        );
    }

    // Full timeline view
    return (
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-3 border border-gray-100">
            <div className="text-xs font-medium text-gray-500 mb-2">ตารางบริการ ({nodes.length} รายการ)</div>

            {/* Timeline */}
            <div className="relative">
                {/* Line */}
                <div className="absolute top-3 left-3 right-3 h-0.5 bg-gray-200" />

                {/* Nodes */}
                <div className="relative flex justify-between">
                    {nodes.map((node, index) => (
                        <div key={index} className="flex flex-col items-center z-10" style={{ width: `${100 / nodes.length}%` }}>
                            <div className={`w-6 h-6 rounded-full ${getPhaseColor(node.phase)} flex items-center justify-center text-white`}>
                                {getPhaseIcon(node.phase)}
                            </div>
                            <div className="mt-1 text-center">
                                <div className="text-xs font-medium text-gray-700">
                                    {node.month === 0 ? 'Day 0' : `M${node.month}`}
                                </div>
                                <div className="text-xs text-gray-500">{node.action}</div>
                                <div className="text-[10px] text-gray-400">{node.date}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
