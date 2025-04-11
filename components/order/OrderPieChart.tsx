'use client';

import { useMemo, useEffect, useRef } from 'react';
import { Chart } from '@antv/g2';

interface Props {
  data: any[];
}
export const OrderPieChart = ({ data }: Props) => {
  const container = useRef(null);
  const chart = useRef<any>(null);
  const dataSouce = useMemo(() => {
    return data.filter((item) => item.count > 0);
  }, [data]);
  const totalCount = useMemo(() => {
    return dataSouce.reduce((acc, cur) => acc + (cur?.count || 0), 0);
  }, [dataSouce]);

  const optimizeData = useMemo(() => {
    const minPercentage = 0.05;
    let adjustedData = dataSouce.map((item) => {
      const percentage = item.count / totalCount;
      return {
        ...item,
        percentage: percentage < minPercentage ? minPercentage : percentage,
      };
    });
    const adjustedTotal = adjustedData.reduce(
      (sum, item) => sum + (item?.percentage || 0),
      0,
    );
    adjustedData = adjustedData.map((item) => ({
      ...item,
      percentage: Math.floor((item.percentage / adjustedTotal) * totalCount),
    }));
    return adjustedData;
  }, [dataSouce, totalCount]);

  const colorMap = {
    sat20: '#492FB2',
    okx: '#D28F43',
    me: '#D84E4F',
  };
  function renderLineChart(container) {
    // 如上
    const chart = new Chart({
      container,
      autoFit: true,
    });

    chart.coordinate({ type: 'theta', innerRadius: 0.65 });

    chart
      .theme({
        type: 'classicDark',
      })
      .data(optimizeData)
      .interval()
      .transform({ type: 'stackY' })
      .encode('y', 'percentage')
      .encode('color', 'label')
      // .scale('color', { palette: 'tableau10' })
      .style('inset', 3)
      .style('radius', 10)
      .legend('color', {
        position: 'bottom',
        layout: { justifyContent: 'center' },
      })
      .tooltip((data) => ({
        name: data.label,
        value: `${data.count}`,
      }));

    chart
      .text()
      .style('text', 'Total')
      .style('x', '50%')
      .style('y', '50%')
      .style('fontSize', 40)
      .style('dy', -20)
      .style('fill', '#fff')
      .style('fontWeight', 'bold')
      .style('textAlign', 'center')
      .tooltip(false);
    chart
      .text()
      .style('text', totalCount.toString())
      .style('x', '50%')
      .style('y', '50%')
      .style('dy', 20)
      .style('fill', '#fff')
      .style('fontSize', 30)
      .style('fontWeight', 'bold')
      .style('textAlign', 'center')
      .tooltip(false);
    chart.render();

    return chart;
  }

  function updateLineChart(chart) {
    if (!optimizeData.length) return;
    console.log(chart);

    chart.data(optimizeData);
    const totalChaild = chart?.children?.[2];
    if (totalChaild) {
      totalChaild.value.style.text = totalCount.toString();
    }
    chart.render();
  }
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
  return <div className="w-96" ref={container}></div>;
};
