'use client';

import { satsToBitcoin, formatLargeNumber } from '@/utils';
import { useMemo, useEffect, useRef, useState } from 'react';
import { Chart } from '@antv/g2';

interface Props {
  data: any;
  chartHeight?: string;
  timeFrame?: string;
  sparseXLabels?: boolean; // NEW A/C: enable/disable label sparsification
  minLabelStep?: number;    // NEW C: override base step (e.g. force >=2)
  mobileMaxXLabels?: number; // NEW: max labels on mobile (default 8)
}

export const OrderLineChart = ({
  data = [],
  chartHeight = '',
  timeFrame,
  sparseXLabels = true,
  minLabelStep,
  mobileMaxXLabels = 6,
}: Props) => {
  const breakpointPx: Record<string, number> = { base: 0, sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 };
  function parseResponsiveHeights(cls: string): Record<string, number> {
    const map: Record<string, number> = {};
    const regex = /(?:(sm|md|lg|xl|2xl):)?h-\[(\d+(?:\.\d+)?)(rem|px)\]/g;
    let m;
    while ((m = regex.exec(cls)) !== null) {
      const bp = m[1] || 'base';
      const val = parseFloat(m[2]);
      const unit = m[3];
      const px = unit === 'rem' ? val * 16 : val;
      map[bp] = px;
    }
    return map;
  }
  const responsiveHeights = parseResponsiveHeights(chartHeight);

  function pickHeight(): number | undefined {
    if (!Object.keys(responsiveHeights).length) return undefined;
    const w = (typeof window !== 'undefined') ? window.innerWidth : 0;
    let chosen: number | undefined = responsiveHeights.base;
    let chosenBpWidth = breakpointPx.base;
    for (const [bp, h] of Object.entries(responsiveHeights)) {
      const bpWidth = breakpointPx[bp] ?? 0;
      if (w >= bpWidth && bpWidth >= chosenBpWidth) {
        chosen = h; chosenBpWidth = bpWidth;
      }
    }
    return chosen;
  }

  const [explicitHeight, setExplicitHeight] = useState<number | undefined>(() => pickHeight());

  useEffect(() => {
    const handler = () => setExplicitHeight(pickHeight());
    if (Object.keys(responsiveHeights).length) {
      window.addEventListener('resize', handler);
    }
    return () => window.removeEventListener('resize', handler);
  }, [chartHeight]);
  useEffect(() => {
    setExplicitHeight(pickHeight());
  }, [chartHeight]);

  const [windowWidth, setWindowWidth] = useState<number>(() => (typeof window !== 'undefined' ? window.innerWidth : 1920));
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const isMobile = windowWidth < 640;

  const originalData = useMemo(() => Array.isArray(data) ? data : [], [data]);

  function baseStep(len: number) {
    if (!sparseXLabels) return 1;
    if (timeFrame === '15m' || timeFrame === '24h') return len <= 6 ? 1 : 2;
    if (len <= 12) return 1;
    if (len <= 24) return 2;
    if (len <= 48) return 3;
    if (len <= 72) return 4;
    return Math.ceil(len / 18);
  }
  const step = useMemo(() => {
    const len = originalData.length;
    let s = baseStep(len);
    if (isMobile) {
      if (timeFrame === '15m' || timeFrame === '24h') {
        if (len > 10) s = Math.max(s, 3);
      } else if (len > 0) {
        const limit = Math.ceil(len / mobileMaxXLabels);
        s = Math.max(s, limit);
      }
    }
    if (minLabelStep) s = Math.max(s, minLabelStep);
    return s;
  }, [originalData.length, timeFrame, isMobile, mobileMaxXLabels, minLabelStep, sparseXLabels]);

  const container = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const rebuiltRef = useRef(false);

  function pruneXAxisLabels() {
    if (!container.current || !sparseXLabels) return;
    const root = container.current as HTMLElement;
    const axisGroups = root.querySelectorAll('.g2-axis') as NodeListOf<HTMLElement>;
    if (!axisGroups.length) return;

    let xAxis: HTMLElement | null = null;
    let maxCount = 0;
    axisGroups.forEach((g) => {
      const cnt = g.querySelectorAll('.g2-axis-label').length;
      if (cnt > maxCount) {
        maxCount = cnt;
        xAxis = g;
      }
    });
    if (!xAxis) return;

    // Casting directly; avoids TS narrowing issues that produced never
    const labelNodes = (xAxis as HTMLElement).querySelectorAll('.g2-axis-label');
    if (!labelNodes.length) return;

    labelNodes.forEach((node, idx) => {
      const el = node as HTMLElement;
      if (step === 1 || idx === 0 || idx === labelNodes.length - 1 || idx % step === 0) {
        el.style.visibility = 'visible';
      } else {
        el.style.visibility = 'hidden';
      }
    });
  }

  function buildChart() {
    if (!container.current) return;
    const c = new Chart({
      container: container.current,
      autoFit: true,
      ...(explicitHeight ? { height: explicitHeight } : {}),
    });
    c.theme({ type: 'classicDark' })
      .data(originalData, { value: { min: 0 } })
      .encode('x', 'label')
      .encode('y', 'value')
      .scale('x', { nice: true })
      .scale('y', { nice: true, tickCount: 5, formatter: (v: any) => `${v} sats` })
      .axis('x', { labelAutoRotate: false, title: null })
      .axis('y', {
        title: null,
        label: { formatter: (v: any) => `${v} sats`, style: { fill: '#ffffff', fontSize: 11 }, autoHide: false, offset: 8 },
        grid: { line: { style: { stroke: '#303030', lineDash: [4, 4], opacity: 0.3 } } },
      });

    const volumeData = originalData.map(d => d.volume || 0).filter(v => v > 0);
    const maxVolume = volumeData.length ? Math.max(...volumeData) : 0;
    let volumeYScale: any = { independent: true, domainMin: 0 };
    if (maxVolume > 0) volumeYScale = { independent: true, domainMin: 0, domain: [0, maxVolume * 1.1], nice: true };

    c.interval()
      .encode('x', 'label')
      .encode('y', 'volume')
      .style('size', 30)
      .style('inset', 2)
      .style('maxWidth', 15)
      .style('fill', '#555555')
      .scale('y', volumeYScale)
      .axis('y', { position: 'right', line: false, tick: false, label: false, grid: false })
      .tooltip(d => ({ title: d.label, name: 'Volume', value: d.volume ? `${formatLargeNumber(d.volume)} sats` : '-' }))
      .tooltip(d => ({ color: false, name: 'Sales', value: d.count ? d.count : '-' }));

    c.line()
      .encode('x', 'label')
      .encode('y', 'value')
      .encode('shape', 'smooth')
      .style({ lineWidth: 2, stroke: '#22c55e' })
      .scale('y', { independent: true, domainMin: 0, formatter: (v: any) => `${v} sats` })
      .axis('y', { position: 'left', label: { formatter: (v: any) => `${v} sats`, style: { fill: '#ffffff', fontSize: 11 }, autoHide: false, offset: 8 }, grid: { line: { style: { stroke: '#303030', lineDash: [4, 4], opacity: 0.5 } } } })
      .tooltip(d => ({ name: 'Avg Price', value: d.valueFormatted || (d.realValue ? `${d.realValue} sats` : '-') }));

    c.on('afterrender', () => requestAnimationFrame(pruneXAxisLabels));
    c.render();
    requestAnimationFrame(pruneXAxisLabels);
    return c;
  }

  useEffect(() => {
    if (chartRef.current) {
      try { chartRef.current.destroy?.(); } catch { /* ignore */ }
    }
    chartRef.current = buildChart();
  }, [originalData, explicitHeight]);

  useEffect(() => {
    requestAnimationFrame(pruneXAxisLabels);
  }, [step, originalData.length, isMobile]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!chartRef.current) return;
      const hasChildren = (chartRef.current?.getSpec?.() || {}).children?.length || 0;
      if (!hasChildren && !rebuiltRef.current) {
        rebuiltRef.current = true;
        try { chartRef.current.destroy?.(); } catch { }
        chartRef.current = buildChart();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [originalData]);

  return <div className={`flex-1 max-w-full ${chartHeight}`} ref={container}></div>;
};
