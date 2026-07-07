import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface DemoSessionContextType {
  isActive: boolean;
  enterDemo: () => void;
  exitDemo: () => void;
}

const DemoSessionContext = createContext<DemoSessionContextType | null>(null);

export function DemoSessionProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);

  const enterDemo = useCallback(() => setIsActive(true), []);
  const exitDemo = useCallback(() => setIsActive(false), []);

  return (
    <DemoSessionContext.Provider value={{ isActive, enterDemo, exitDemo }}>
      {children}
    </DemoSessionContext.Provider>
  );
}

export function useDemoSession() {
  const ctx = useContext(DemoSessionContext);
  if (!ctx) throw new Error('useDemoSession must be used within DemoSessionProvider');
  return ctx;
}
