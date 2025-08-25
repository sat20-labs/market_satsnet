'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import CreatePoolBasic from './CreatePoolBasic';
import CreatePoolAdvanced from './CreatePoolAdvanced';

export default function CreatePool({ closeModal }: { closeModal: () => void }) {
    const { t } = useTranslation();

    return (
        <div className="max-w-[1360px] mx-auto">
            <Tabs defaultValue="basic" className="mt-4 p-6">
                <div className="flex items-center justify-between border-b border-zinc-700/60">
                    <TabsList className="flex -mb-px">
                        <TabsTrigger
                            value="basic"
                            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:text-white"
                        >
                            {t('pages.createPool.basic.tab', { defaultValue: 'Simple' })}
                        </TabsTrigger>
                        <TabsTrigger
                            value="advanced"
                            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:text-white"
                        >
                            {t('pages.createPool.advanced.tab', { defaultValue: 'Advanced' })}
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="basic" className="pt-4">
                    <CreatePoolBasic closeModal={closeModal} />
                </TabsContent>

                <TabsContent value="advanced" className="pt-4">
                    <CreatePoolAdvanced closeModal={closeModal} />
                </TabsContent>
            </Tabs>
        </div>
    );
}