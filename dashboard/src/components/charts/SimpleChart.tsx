import React from 'react';
import './SimpleChart.css';

interface ChartData {
  label: string;
  value: number;
  color?: string;
}

interface SimpleChartProps {
  data: ChartData[];
  type: 'bar' | 'line';
  height?: number;
  title?: string;
}

const SimpleChart: React.FC<SimpleChartProps> = ({ 
  data, 
  type, 
  height = 200, 
  title 
}) => {
  const maxValue = Math.max(...data.map(d => d.value)) || 1;

  return (
    <div className="simple-chart">
      {title && <h3 className="chart-title">{title}</h3>}
      <div className="chart-container" style={{ height }}>
        {type === 'bar' && (
          <div className="bar-chart">
            {data.map((item, index) => (
              <div key={index} className="bar-item">
                <div 
                  className="bar"
                  style={{ 
                    height: `${((item.value || 0) / maxValue) * 100}%`,
                    backgroundColor: item.color || 'var(--color-primary)'
                  }}
                />
                <span className="bar-label">{item.label}</span>
                <span className="bar-value">{item.value}</span>
              </div>
            ))}
          </div>
        )}
        {type === 'line' && data.length > 0 && (
          <div className="line-chart">
            <svg width="100%" height="100%" viewBox="0 0 300 150">
              <polyline
                points={data.map((item, index) => {
                  const x = data.length > 1 ? (index / (data.length - 1)) * 280 + 10 : 150;
                  const y = 150 - ((item.value || 0) / maxValue) * 130;
                  return `${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke={data[0]?.color || 'var(--color-primary)'}
                strokeWidth="2"
              />
              {data.map((item, index) => {
                const x = data.length > 1 ? (index / (data.length - 1)) * 280 + 10 : 150;
                const y = 150 - ((item.value || 0) / maxValue) * 130;
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r="3"
                    fill={item.color || 'var(--color-primary)'}
                  />
                );
              })}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleChart;