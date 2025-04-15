import { Loader2 } from 'lucide-react';

interface Props {
  loading: boolean;
  children: React.ReactNode;
  className?: string;
}
export function ContentLoading({ loading, children, className }: Props) {
  return (
    <div className={'w-full' + className}>
      {loading ? (
        <div className="flex justify-center items-center min-h-[30rem]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        children
      )}
    </div>
  );
}
