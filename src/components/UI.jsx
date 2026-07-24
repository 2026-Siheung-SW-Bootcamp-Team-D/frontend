import { useState, useEffect } from 'react';
import { addToastListener } from '../hooks/useToast';

export function Button({ variant = 'coral', children, className = '', ...props }) {
  const variants = {
    coral: 'bg-coral text-white font-bold',
    navy: 'bg-navy text-white font-bold',
    line: 'bg-white text-ink border border-line font-bold',
  };
  return <button className={`w-full px-4 py-4 rounded-[16px] text-[15.5px] flex items-center justify-center gap-2 cursor-pointer ${variants[variant]} ${className}`} {...props}>{children}</button>;
}

export function Avatar({ emoji, label, color = 'p1' }) {
  const colors = { p1: 'bg-coral', p2: 'bg-teal', p3: 'bg-yellow', p4: 'bg-[#5b6b8c]' };
  return <div className={`w-10 h-10 ${colors[color]} rounded-full flex items-center justify-center text-white font-bold text-[12px]`}>{emoji || label?.[0]}</div>;
}

export function Toast() {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const cleanup = addToastListener((msg) => {
      setMessage(msg);
      setVisible(true);
      setTimeout(() => setVisible(false), 1600);
    });
    return cleanup;
  }, []);
  return <div className={`fixed left-1/2 -translate-x-1/2 bottom-24 z-50 bg-navy text-white text-[13px] font-bold px-[18px] py-3 rounded-[14px] transition-all ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>{message}</div>;
}
