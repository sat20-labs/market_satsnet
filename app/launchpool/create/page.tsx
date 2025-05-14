'use client';

import { useRouter } from 'next/navigation';
import CreatePool from '@/components/launchpool/CreatePool';

const CreateLaunchPoolPage = () => {
  const router = useRouter();

  const handleClose = () => {
    router.push('/launchpool'); // 自动返回池子列表页面
  };

  return <CreatePool closeModal={handleClose} />;
};

export default CreateLaunchPoolPage;
