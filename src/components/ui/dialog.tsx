import React from 'react';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  return (
    <div className={`fixed inset-0 z-50 ${open ? 'block' : 'hidden'}`}>
      <div className="fixed inset-0 bg-black opacity-50" onClick={() => onOpenChange(false)}></div>
      <div className="relative bg-white w-full max-w-lg mx-auto mt-24 p-6 rounded-lg shadow-lg">
        {children}
      </div>
    </div>
  );
};

interface DialogContentProps {
  className?: string;
  children: React.ReactNode;
}

export const DialogContent: React.FC<DialogContentProps> = ({ className, children }) => {
  return <div className={className}>{children}</div>;
}; 