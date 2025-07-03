'use client';
import { useEffect } from 'react';
import { redirect } from 'next/navigation';
export default function Home() {
  useEffect(() => {
    console.log('Redirecting to /market'); // Debugging log to verify startup
    redirect('/market');
  }, []);
  return <div>Home</div>;
}