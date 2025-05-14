'use client';

import { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './button';

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
}

export const Modal = ({ children, onClose }: ModalProps) => {
  if (typeof window === 'undefined') return null; // Ensure it only renders on the client side

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            ✕
          </Button>
        </div>
        <div>{children}</div>
      </div>
    </div>,
    document.body
  );
};
