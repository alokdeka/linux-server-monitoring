import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ServerMetrics } from '../../types';

export interface MetricsChartProps {
  data: ServerMetrics[];
  metricType: 'cpu' | 'memory' | 'disk';
  height?: number;
}

const MetricsChart: React.FC<MetricsChartProps> = ({
  data,
  metricType,
  height = 300,
}) => {
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTooltipLabel = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getChartData = () => {
    return data.map((metric) => {
      const baseData = {
        timestamp: metric.timestamp,
        time: formatTimestamp(metric.timestamp),
      };

      switch (metricType) {
        case 'cpu':
          return {
            ...baseData,
            value: Math.round(metric.cpuUsage * 100) / 100,
          };
        case 'memory':
          return {
            ...baseData,
            value: Math.round(metric.memory.percentage * 100) / 100,
          };
        case 'disk':
          // Use the root filesystem or first disk if root not available
          const rootDisk =
            metric.diskUsage.find((disk) => disk.mountpoint === '/') ||
            metric.diskUsage[0];
          return {
            ...baseData,
            value: rootDisk ? Math.round(rootDisk.percentage * 100) / 100 : 0,
          };
        default:
          return { ...baseData, value: 0 };
      }
    });
  };

  const getChartConfig = () => {
    switch (metricType) {
      case 'cpu':
        return {
          title: 'CPU Usage',
          color: '#8884d8',
          unit: '%',
          domain: [0, 100],
        };
      case 'memory':
        return {
          title: 'Memory Usage',
          color: '#82ca9d',
          unit: '%',
          domain: [0, 100],
        };
      case 'disk':
        return {
          title: 'Disk Usage',
          color: '#ffc658',
          unit: '%',
          domain: [0, 100],
        };
      default:
        return {
          title: 'Metrics',
          color: '#8884d8',
          unit: '%',
          domain: [0, 100],
        };
    }
  };

  const chartData = getChartData();
  const config = getChartConfig();

  if (chartData.length === 0) {
    return (
      <div
        className="metrics-chart-empty"
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #e0e0e0',
          borderRadius: '4px',
          backgroundColor: '#f9f9f9',
        }}
      >
        <p style={{ color: '#666', margin: 0 }}>
          No {config.title.toLowerCase()} data available
        </p>
      </div>
    );
  }

  return (
    <div className="metrics-chart">
      <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>
        {config.title}
      </h4>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="time"
            stroke="#666"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={config.domain}
            stroke="#666"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}${config.unit}`}
          />
          <Tooltip
            labelFormatter={formatTooltipLabel}
            formatter={(value: number | undefined) =>
              value !== undefined
                ? [`${value}${config.unit}`, config.title]
                : ['', '']
            }
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '12px',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="value"
            stroke={config.color}
            strokeWidth={2}
            dot={false}
            name={config.title}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MetricsChart;
