'use client';
import { useEffect } from 'react';
import { redirect } from 'next/navigation';
export default function Home() {
  useEffect(() => {
    redirect('/market');
  }, []);
  return <div className="py-4"></div>;
}
