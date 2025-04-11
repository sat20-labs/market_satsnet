interface Props {
  asset: any;
}
export const NameItem = ({ asset }: Props) => {
  return (
    <div className="w-full h-full uppercase flex items-center justify-center">
      <p className="font-medium pt-2 text-xl md:text-2xl md:pt-3 text-wrap break-all p-4">
        {asset.assets_name}
      </p>
    </div>
  );
};
