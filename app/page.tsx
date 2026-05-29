'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/swap${window.location.search || ''}`);
  }, [router]);
  return null;
}
