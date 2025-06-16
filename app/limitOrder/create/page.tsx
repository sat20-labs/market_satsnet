'use client';

import { useRouter } from 'next/navigation';
import CreateLimitOrder from '@/components/satoshinet/limitorder/CreateLimitOrder';

const CreateLimitOrderPage = () => {
  const router = useRouter();

  const handleClose = () => {
    router.push('/swap');
  };

  return <CreateLimitOrder closeModal={handleClose} />;
};

export default CreateLimitOrderPage;
