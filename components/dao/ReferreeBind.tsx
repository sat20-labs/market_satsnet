'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { buildBindInvoke, invokeDaoContractSatsNet } from '@/domain/services/dao';

interface ReferreeItem {
    uid: string;
    address: string;
}

interface ReferreeBindProps {
    contractUrl: string;
    refresh?: () => void;
    userUid?: string;
}

const ReferreeBind = ({ contractUrl, refresh, userUid }: ReferreeBindProps) => {
    const { t } = useTranslation();
    const [items, setItems] = useState<ReferreeItem[]>([{ uid: '', address: '' }]);
    const [loading, setLoading] = useState(false);

    const handleAddRow = () => {
        setItems([...items, { uid: '', address: '' }]);
    };

    const handleRemoveRow = (index: number) => {
        if (items.length === 1) {
            // keep at least one row but clear it
            setItems([{ uid: '', address: '' }]);
        } else {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const handleItemChange = (index: number, field: keyof ReferreeItem, value: string) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const handleBind = async () => {
        // 检查自己的UID是否为空
        if (!userUid) {
            toast.error(t('common.please_register_first', { defaultValue: '请先注册成功后再绑定被推荐人' }));
            return;
        }
        // Filter out empty rows
        const validItems = items.filter(item => item.uid.trim() && item.address.trim());
        if (validItems.length === 0) {
            toast.error(t('common.please_input_all_fields'));
            return;
        }

        setLoading(true);
        try {
            const invoke = buildBindInvoke(validItems);
            await invokeDaoContractSatsNet(contractUrl, invoke);
            toast.success(t('common.submitted_waiting', { defaultValue: '已提交，等待审核/确认' }));
            // Clear inputs
            setItems([{ uid: '', address: '' }]);
            // Refresh parent data if provided
            refresh?.();
        } catch (error: any) {
            console.error('Bind referree error:', error);
            toast.error(error?.message || t('common.bind_referrees_failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 space-y-4">
            <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-300">
                    {t('common.bind_referree')}
                </label>
                <p className="text-sm text-zinc-500">
                    添加被推荐人的UID和地址，每行一个。
                </p>
            </div>

            <div className="space-y-3">
                {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                        <div>
                            <div className="text-xs text-zinc-500 mb-1">{t('common.referree_uid')}</div>
                            <Input
                                value={item.uid}
                                onChange={(e) => handleItemChange(index, 'uid', e.target.value)}
                                placeholder={t('common.referree_uid')}
                                disabled={loading}
                                className="bg-zinc-800 border-zinc-700 text-white"
                            />
                        </div>
                        <div>
                            <div className="text-xs text-zinc-500 mb-1">{t('common.referree_address')}</div>
                            <Input
                                value={item.address}
                                onChange={(e) => handleItemChange(index, 'address', e.target.value)}
                                placeholder={t('common.referree_address')}
                                disabled={loading}
                                className="bg-zinc-800 border-zinc-700 text-white"
                            />
                        </div>
                        <div className="flex gap-2">
                            {index === items.length - 1 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddRow}
                                    disabled={loading}
                                    className="flex-1 h-10"
                                >
                                    {t('common.add_referree')}
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveRow(index)}
                                disabled={loading || items.length === 1}
                                className="flex-1 h-10"
                            >
                                {t('common.remove')}
                            </Button>

                        </div>
                    </div>
                ))}
            </div>

            <Button
                onClick={handleBind}
                disabled={loading || items.every(item => !item.uid.trim() || !item.address.trim())}
                className="w-full btn-gradient"
            >
                {loading ? t('common.processing', { defaultValue: '处理中...' }) : t('common.bind_referrees')}
            </Button>
        </div>
    );
};

export default ReferreeBind;