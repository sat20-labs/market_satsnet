'use client';

import { satsToBitcoin, formatLargeNumber } from '@/utils';
import { useMemo, useEffect, useRef, useState, use } from 'react';
import { Chart } from '@antv/g2';

interface Props {
  data: any;
}
export const OrderLineChart = ({ data = [] }: Props) => {
  console.log('data', data);
  
  const container = useRef(null);
  const chart = useRef<any>(null);

  function renderLineChart(container) {
    const chart = new Chart({
      container: container,
      autoFit: true,
    });

    // 计算volume数据的动态Y轴范围
    const volumeData = data.map(d => d.volume || 0).filter(v => v > 0);
    const maxVolume = Math.max(...volumeData);
    const minVolume = Math.min(...volumeData);
    
    // 如果数据差异很大，调整Y轴范围让较小的值更明显
    let volumeYScale: any = { independent: true, domainMin: 0 };
    if (maxVolume > 0 && minVolume > 0 && maxVolume / minVolume > 100) {
      // 当最大值是最小值的100倍以上时，调整范围
      volumeYScale = { 
        independent: true, 
        domainMin: 0,
        domain: [0, maxVolume * 1.1], // 使用domain属性设置范围
        nice: true
      };
    }

    chart
      .theme({
        type: 'classicDark',
      })
      .data(data, {
        value: {
          min: 0,
        },
      })
      .encode('x', 'label')
      .encode('y', 'value')
      .scale('x', {
        nice: true,
      })
      .scale('y', { 
        nice: true,
        tickCount: 5,
        formatter: (value) => `${value} sats`
      })
      .axis('x', {
        labelAutoRotate: false,
        title: null,       
      })
      .axis('y', {
        title: null,
        label: {
          formatter: (value) => `${value} sats`,
          style: {
            fill: '#ffffff',
            fontSize: 11
          },
          autoHide: false,
          offset: 8
        },
        grid: {
          line: {
            style: {
              stroke: '#303030',
              lineDash: [4, 4], // Add dashed style for horizontal grid lines
              opacity: 0.3,      // Make them slightly transparent
            },
          },
        },
      });

    chart
      .interval()
      .encode('x', 'label')
      .encode('y', 'volume')
      .style('size', 30)
      .style('inset', 2)
      .style('maxWidth', 15)
      .style('fill', '#555555') // Add this line to set the volume bar color
      .scale('y', volumeYScale)
      .axis('y', {
        position: 'right',
        line: false,
        tick: false,
        label: false,
        grid: false,
      })
      .tooltip((d) => {
        return {
          title: d.label,
          name: 'Volume',
          value: d.volume ? `${formatLargeNumber(d.volume)} sats` : '-',
        };
      })
      .tooltip((d) => ({
        color: false,
        name: 'Sales',
        value: d.count ? d.count : '-',
      }));

    chart
      .line()
      .encode('shape', 'smooth')
      .style({
        lineWidth: 2,
        stroke: '#22c55e',
      })
      .scale('y', { 
        independent: true, 
        domainMin: 0,
        formatter: (value: any) => `${value} sats` 
      })
      .axis('y', {
        position: 'left',
        label: {
          formatter: (value: any) => `${value} sats`,
          style: {
            fill: '#ffffff', 
            fontSize: 11
          },
          autoHide: false,
          offset: 8
        },
        grid: {
          line: {
            style: {
              stroke: '#303030',
              lineDash: [4, 4], // Add dashed style for horizontal grid lines
              opacity: 0.5,      // Make them slightly transparent
            },
          },
        },
      })
      .tooltip((d) => ({
        name: 'Avg Price',
        value: d.valueFormatted || (d.realValue ? `${d.realValue} sats` : '-'),
      }));
    chart.render();
    return chart;
  }

  function updateLineChart(chart) {
    if (!data.length) return;

    // 重新计算volume数据的动态Y轴范围
    const volumeData = data.map(d => d.volume || 0).filter(v => v > 0);
    const maxVolume = Math.max(...volumeData);
    const minVolume = Math.min(...volumeData);
    
    // 如果数据差异很大，调整Y轴范围让较小的值更明显
    let volumeYScale: any = { independent: true, domainMin: 0 };
    if (maxVolume > 0 && minVolume > 0 && maxVolume / minVolume > 100) {
      volumeYScale = { 
        independent: true, 
        domainMin: 0,
        domain: [0, maxVolume * 1.1], // 使用domain属性设置范围
        nice: true
      };
    }

    chart.data(data);

    // 更新volume柱状图的Y轴比例
    const volumeInterval = chart.getNodesByType('interval')[0];
    if (volumeInterval) {
      volumeInterval.scale('y', volumeYScale);
    }

    // 重新渲染
    chart.render();
  }
  const types = [
    {
      label: '24h',
      value: '24h',
    },
    {
      label: '7d',
      value: '7d',
    },
    {
      label: '30d',
      value: '30d',
    },
  ];
  useEffect(() => {
    if (chart.current) {
      updateLineChart(chart.current);
    }
  }, [data]);
  useEffect(() => {
    if (!chart.current) {
      chart.current = renderLineChart(container.current);
    }
  }, []);
  return <div className="flex-1 max-w-full" ref={container}></div>;
};
