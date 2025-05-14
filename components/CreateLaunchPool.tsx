'use client';

import { Button } from '@/components/ui/button';

const CreateLaunchPool = () => {
  const handleCreate = () => {
    // Handle pool creation logic here
    alert('LaunchPool created successfully!');
  };

  return (
    <div className="p-4 max-w-lg mx-auto bg-zinc-900 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-white mb-4">Create LaunchPool</h1>
      {/* Add form fields for creating a launch pool */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleCreate}>
          Create
        </Button>
      </div>
    </div>
  );
};

export default CreateLaunchPool;
