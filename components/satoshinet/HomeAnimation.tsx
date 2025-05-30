'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';

const HomeAnimation = () => {

    const [step, setStep] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setStep(prev => (prev + 1) % 4);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const flows = [
        { id: 'ordx', color: '#F7931A', label: 'ORDX', position: 'left' },
        { id: 'runes', color: '#29B6F6', label: 'Runes', position: 'left' },
        { id: 'brc20', color: '#AB47BC', label: 'BRC20', position: 'right' },
        { id: 'ordinals', color: '#66BB6A', label: 'Ordinals', position: 'right' },
    ];

    const appNames = [
        { name: 'SATSWAP', icon: 'solar:square-transfer-vertical-linear' },
        { name: 'LaunchPool', icon: 'material-symbols:rocket-outline-rounded' },
        { name: 'SWAP', icon: 'mdi:cached' },
        { name: 'GameFi', icon: 'mdi:gamepad-variant' },
        { name: 'SocialFi', icon: 'mdi:account-group' },
        { name: 'Dapps', icon: 'mdi:apps' },
    ];

    return (
        <div>
            <div className="flex flex-col items-center justify-center h-full bg-gradient-to-tl from-zinc-900 via-zinc-900 to-zinc-950 text-zinc-100 py-10 mt-20 px-2 sm:px-10 border border-zinc-800 rounded-2xl shadow-lg">
                <h1 className="text-2xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 mb-4">
                    L1 ⇄ L2 Transcending Demo
                </h1>
                <div className="relative top-[40px] w-full max-w-4xl flex justify-between items-center p-6 border border-dashed border-zinc-500 rounded-4xl">
                    {appNames.map((app, index) => (
                        <div key={index} className="flex flex-col items-center px-1">
                            <span className="flex justify-center items-center text-sm font-bold text-zinc-100 sm:px-5 sm:py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full">
                                <Icon icon={app.icon} className="w-4 h-4 sm:w-6 sm:h-6 m-2 sm:m-0 sm:mr-2 text-zinc-50" />
                                <span className="hidden sm:inline">{app.name}</span> {/* Hide name on mobile */}
                            </span>
                        </div>
                    ))}
                </div>
                <div className="relative top-[30px] w-full max-w-4xl flex justify-between items-center px-16 mt-6">
                    {appNames.map((app, index) => (
                        <div key={index} className="flex flex-col items-center px-2">
                            <Icon
                                icon="material-symbols:arrow-warm-up"
                                className="w-6 h-8 mt-4 text-sky-500"
                            />

                        </div>
                    ))}
                </div>
                <div className="relative w-full max-w-4xl h-[600px] px-16 rounded-xl">
                    {/* Distributed Items Above SatoshiNet */}
                    <div className="relative left-[-270px] top-[95px] flex justify-start text-base sm:text-2xl font-medium text-white mt-4 text-center">
                        <span className='text-xs font-normal text-zinc-400 px-3 py-2 border border-zinc-500 rounded-lg'> L 2</span>
                        <span className='mx-3 mt-1 text-zinc-200'>SATOSHINET </span>
                    </div>

                    {/* SatoshiNet (L2) */}
                    <div className="absolute flex flex-col items-center justify-start w-full left-1/2 top-10 transform -translate-x-1/2 px-3 py-6">
                        <div className="bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 rounded-3xl w-full">
                            <div className="bg-black/60 rounded-3xl px-4 py-6 w-full overflow-hidden">

                                <motion.div
                                    className="grid grid-cols-8 gap-4 w-full px-4"
                                    animate={{ x: ['-90%', '110%'] }} // Change direction to move right
                                    transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
                                >
                                    {Array.from({ length: 8 }).map((_, index) => (
                                        <div
                                            key={`l2-block-${index}`}
                                            className="h-16 sm:h-20 sm:w-20 bg-gradient-to-tr from-purple-500 to-sky-700 rounded-lg shadow-md flex items-center justify-center text-white text-sm font-bold"
                                        >
                                            <span className='hidden sm:inline'>Block</span> {8 - index}
                                        </div>
                                    ))}
                                </motion.div>
                            </div>
                        </div>
                    </div>


                    {/* MainNet (L1) */}
                    <div className="absolute flex flex-col items-center justify-end w-full left-1/2 bottom-0 transform -translate-x-1/2 px-3 py-6">
                        <div className="bg-gradient-to-r from-gray-500 via-green-600 to-sky-700 rounded-3xl w-full">
                            <div className="bg-black/30 rounded-3xl px-4 py-6 w-full overflow-hidden">

                                <motion.div
                                    className="grid grid-cols-8 gap-4 w-full px-4"
                                    animate={{ x: ['-50%', '50%'] }} // Change direction to move right
                                    transition={{ repeat: Infinity, duration: 60, ease: 'linear' }}
                                >
                                    {Array.from({ length: 8 }).map((_, index) => (
                                        <div
                                            key={`l1-block-${index}`}
                                            className="h-16 sm:h-20 bg-gradient-to-tr from-yellow-600 to-orange-800 rounded-lg shadow-md flex items-center justify-center text-white text-sm font-bold"
                                        >
                                            <span className='hidden sm:inline'>Block</span> {8 - index}
                                        </div>
                                    ))}
                                </motion.div>
                            </div>

                        </div>
                        <div className="relative left-[-550px] bottom-[90px] flex justify-start text-base sm:text-2xl font-medium text-white mt-4 text-center">

                            {/* <span className='text-xs font-normal text-orange-300 px-3 py-2 border border-orange-300 rounded-lg mr-2'> DEX</span> */}
                            <span className='text-xs font-normal text-zinc-400 px-3 py-2 border border-zinc-500 rounded-lg'> L 1</span>
                            <span className='mx-4 text-zinc-200'>MAINNET </span>
                        </div>

                    </div>


                    {/* Flows */}
                    {flows.map((asset, index) => (
                        <React.Fragment key={asset.id}>
                            {/* Dashed Line */}
                            <motion.div
                                className="absolute border-l-2 border-dashed border-gray-300"
                                style={{
                                    height: '210px',
                                    left: asset.position === 'left' ? `${5 + index * 15}%` : `${67 + (index - 2) * 15}%`,
                                    top: 190,
                                }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.5 }}
                            />
                            {/* Asset */}
                            <motion.div
                                className="absolute text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-full text-white border border-gray-300 shadow-md"
                                initial={{ y: 0, opacity: 0 }}
                                animate={{
                                    y: step === index ? 260 : 0,
                                    opacity: step === index ? 0.8 : 0.5,
                                }}
                                transition={{ duration: 1 }}
                                style={{
                                    left: asset.position === 'left' ? `${8 + index * 15}%` : `${68 + (index - 2) * 15}%`,
                                    top: 150,
                                    backgroundColor: asset.color,
                                }}
                            >
                                <span className="rotate-90 sm:rotate-0">{asset.label}</span>
                            </motion.div>
                            {/* 通道描述 */}
                            <div
                                className="absolute text-sm font-bold text-zinc-200 transform -translate-x-1/2"
                                style={{
                                    left: asset.position === 'left' ? `${15 + index * 15}%` : `${77 + (index - 2) * 15}%`,
                                    top: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    writingMode: 'vertical-rl',
                                    textOrientation: 'upright',
                                }}
                            >
                                <span className='flex justify-center items-center rounded-sm'>
                                    <Icon icon="meteocons:pressure-high-fill" className="w-[5em] h-[5em] mb-6 items-center" />
                                    <Icon icon="lucide:zap" className="w-5 h-5 mb-2" /> {index + 1}
                                    <Icon icon="meteocons:pressure-low" className="w-[5em] h-[5em] mt-4" />
                                </span>
                            </div>
                            {/* 灰色虚线 */}
                            <motion.div
                                className="absolute border-l-2 border-dashed border-gray-300"
                                style={{
                                    height: '210px',
                                    left: asset.position === 'left' ? `${18 + index * 15}%` : `${79 + (index - 2) * 15}%`,
                                    top: 190,
                                }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.5 }}
                            />
                        </React.Fragment>
                    ))}

                    {/* Lightning Channel */}
                    <motion.div
                        className="absolute w-full sm:w-4xl left-1/2 top-2/5 mt-5 transform -translate-x-1/2 text-sm px-4 py-3 border-y-4 border-b-sky-400 border-t-gray-800/50 rounded-full bg-zinc-900/50 shadow-lg"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 1.8 }}
                    >
                        <span className="flex justify-center items-center sm:text-xl font-normal text-sky-500">
                            <Icon icon="lucide:zap" className="w-10 h-10 text-center mr-2" /> Lightning Channel
                        </span>
                    </motion.div>
                </div>

                <p className="mt-6 h-30 text-gray-400 text-sm mb-4">
                </p>
            </div>

        </div>
    );
}

export default HomeAnimation;
