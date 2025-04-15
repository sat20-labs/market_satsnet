import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export const NameMarketNav = () => {
  const nav = useRouter();
  const list = [
    {
      label: '.btc',
      path: '/ordx/ticker?ticker=btc&assets_type=ns',
    },
    {
      label: '.sats',
      path: '/ordx/ticker?ticker=sats&assets_type=ns',
    },
    {
      label: '.unisat',
      path: '/ordx/ticker?ticker=unisat&assets_type=ns',
    },
    {
      label: '.x',
      path: '/ordx/ticker?ticker=x&assets_type=ns',
    },
    {
      label: 'pureName',
      path: '/ordx/ticker?ticker=un&assets_type=ns',
    },
  ];

  const handlerClick = (item: { path: string }) => {
    nav.push(item.path);
  };
  return (
    <div className="flex gap-2 mb-4">
      {list.map((item) => (
        <Button
          key={item.label}
          variant="outline"
          onClick={() => handlerClick(item)}
          className="border border-gray-700/90 rounded-xl"
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
};
