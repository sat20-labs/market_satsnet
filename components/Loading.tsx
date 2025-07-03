import { Loader2 } from 'lucide-react';

interface Props {
  className?: string;
}
export function Loading({ className }: Props) {
  return (
    <div className={'w-full' + className}>
      <div className="flex justify-center items-center min-h-[30rem]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    </div>
  );
}
