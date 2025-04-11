interface InscribeCheckItemProps {
  label: string | number;
  value: string;
}
export const InscribeCheckItem = ({ label, value }: InscribeCheckItemProps) => {
  return (
    <div className="min-h-[4rem] flex rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 w-full">
      <div className="flex justify-center items-center bg-gray-300 dark:bg-gray-600 w-20">
        <div className="w-6 h-6 bg-gray-400 rounded-full flex justify-center items-center">
          {label}
        </div>
      </div>
      <div className="flex flex-1 items-center px-4 py-2 break-all">
        {value}
      </div>
    </div>
  );
};
