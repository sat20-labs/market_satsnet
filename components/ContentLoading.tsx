import { Spinner } from '@nextui-org/react';

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
          <Spinner />
        </div>
      ) : (
        children
      )}
    </div>
  );
}
