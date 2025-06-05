'use client';

import { useRouter } from 'next/navigation';
import CreateSwap from '@/components/swap/CreateSwap';

const CreateLaunchPoolPage = () => {
  const router = useRouter();

  const handleClose = () => {
    router.push('/swap');
  };

  return <CreateSwap closeModal={handleClose} />;
};

export default CreateLaunchPoolPage;
