import Image from 'next/image';
import React from 'react';

interface WalletDownloadProps {
    className?: string;
    iconSize?: number;
    showLabel?: boolean;
}

const chromeUrl = 'https://github.com/sat20-labs/sat20wallet/releases/download/0.0.1/sat20wallet-chrome.zip';
const googlePlayUrl = 'https://chromewebstore.google.com/detail/sat20-wallet/dfdlimjfgcjlgghagidokgkdgcdggpjm?hl=zh-CN&utm_source=ext_sidebar';
const androidUrl = '/files/app-debug.apk';
const iosUrl = '/files/app-debug.ipk';

const WALLET_ITEMS = [
    //   { key: 'apple', lines: ['Download on the', 'App Store'], src: '/wallet/apple.svg', href: iosUrl },
    { key: 'google-play', lines: ['Download wallet', 'Google Play'], src: '/wallet/google-play.svg', href: googlePlayUrl },
    { key: 'android', lines: ['Download wallet', 'Android APK'], src: '/wallet/android.svg', href: androidUrl },
    { key: 'chrome', lines: ['Download wallet', 'Chrome extension'], src: '/wallet/chrome.svg', href: chromeUrl },
];

export const WalletDownload: React.FC<WalletDownloadProps> = ({ className = '', iconSize = 22, showLabel = false }) => {
    return (
        <div className={`w-full ${className}`}>
            {showLabel && <div className="text-[11px] text-zinc-400 mb-1">Wallet Download</div>}
            <div className="grid grid-cols-2 md:flex md:flex-row md:items-center md:gap-4 gap-3">
                {WALLET_ITEMS.map(item => (
                    <a
                        key={item.key}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center rounded-xl border border-zinc-700/60 bg-zinc-800/40 hover:bg-zinc-700/50 transition-colors px-3 py-2 md:px-4 md:py-2 shadow-sm"
                    >
                        <Image
                            src={item.src}
                            alt={item.lines[1]}
                            width={iconSize}
                            height={iconSize}
                            className="mr-3 flex-shrink-0"
                        />
                        <div className="flex flex-col leading-tight">
                            <span className="text-[11px] text-zinc-400 group-hover:text-zinc-300">{item.lines[0]}</span>
                            <span className="text-[13px] font-medium text-zinc-200 group-hover:text-white whitespace-nowrap">{item.lines[1]}</span>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
};

export default WalletDownload;
