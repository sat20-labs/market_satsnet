import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils/index';
import styles from './HomeMintTabs.module.css';

interface HomeMintTabsProps {
    value: string;
    onChange?: (key: string) => void;
    tabs?: { label: string; key: string }[];
    variant?: 'default' | 'tags' | 'underline';
    className?: string;
}

export const HomeMintTabs = ({ value, onChange, tabs, variant = 'default', className }: HomeMintTabsProps) => {
    const { t } = useTranslation();
    const defaultList = [
        { label: t('pages.home.ordx'), key: 'ordx' },
        { label: t('pages.home.runes'), key: 'runes' },
    ];
    const list = tabs && tabs.length > 0 ? tabs : defaultList;
    const changeHandler = (key: string) => onChange?.(key);
    const isTags = variant === 'tags';
    const isUnderline = variant === 'underline';

    return (
        <div className={cn('not-prose', styles.root)}>
            <Tabs value={value} onValueChange={changeHandler} className={cn('h-full', className)}>
                <TabsList
                    className={cn(
                        'h-9',
                        isTags
                            ? 'rounded-none py-1 px-2 gap-4 !bg-zinc-900/80'
                            : isUnderline
                                // 加 relative，底部基准线
                                ? 'relative bg-transparent gap-4 px-0 py-0 border-b border-zinc-800'
                                : 'bg-zinc-700/80 py-0 px-2'
                    )}
                >
                    {list.map((item) => (
                        <TabsTrigger
                            key={item.key}
                            value={item.key}
                            className={cn(
                                'px-4 h-9 transition-colors',
                                isTags
                                    ? [
                                        'rounded-md text-zinc-300 hover:text-white',
                                        'data-[state=active]:!bg-lime-400 data-[state=active]:!text-black',
                                    ].join(' ')
                                    : isUnderline
                                        ? [
                                            // 文字颜色与权重
                                            'relative rounded-none px-0 text-zinc-400 hover:text-white',
                                            'data-[state=active]:text-white data-[state=active]:font-medium',
                                            // 伪元素下划线（悬停/激活显著）
                                            'after:content-[""] after:absolute after:left-0 after:-bottom-[1px] after:h-[2px] after:w-full',
                                            'after:bg-lime-400 after:opacity-0 after:scale-x-0 after:origin-left',
                                            'after:transition-all after:duration-200',
                                            'data-[state=active]:after:opacity-100 data-[state=active]:after:scale-x-100',
                                        ].join(' ')
                                        : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {item.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>
        </div>
    );
};