'use client';
import { useTranslation } from 'react-i18next';
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
} from '@nextui-org/react';
import { useState, useMemo } from 'react';
import { Icon } from '@iconify/react';
export const LanguageSelect = () => {
  const { i18n } = useTranslation();
  const items = [
    { key: 'en', label: 'Engish' },
    { key: 'zh-CN', label: '中文' },
  ];
  
  const [selectedKeys, setSelectedKeys] = useState(new Set([i18n.language]));

  const selectedValue = useMemo(
    () => Array.from(selectedKeys).join(', ').replaceAll('_', ' '),
    [selectedKeys],
  );
  const onSelectionChange = (e: any) => {
    const _l = Array.from(e)[0] as string;
    if (_l) {
      i18n.changeLanguage(_l);
    }
    setSelectedKeys(e);
  };
  return (
    <Dropdown>
      <DropdownTrigger>
        <Button variant="light" isIconOnly className="capitalize">
          <Icon icon="iconoir:language" className="text-xl" />
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Single selection example"
        variant="flat"
        disallowEmptySelection
        selectionMode="single"
        selectedKeys={selectedKeys}
        onSelectionChange={onSelectionChange}
      >
        {items.map((item) => (
          <DropdownItem key={item.key}>{item.label}</DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};
