import React, { createContext, useContext, useState, useEffect } from 'react';

interface DemoContextType {
  isDemoMode: boolean;
  setDemoMode: (demo: boolean) => void;
  demoData: {
    user: {
      id: string;
      email: string;
      name: string;
      role: 'demo';
      account_balance: number;
      phone: string;
    };
    investments: Array<{
      id: string;
      user_id: string;
      species_id: string;
      plant_count: number;
      total_amount: number;
      price_per_plant: number;
      plantation_year: number;
      expected_harvest_year: number;
      weight_per_plant_kg: number;
      status: string;
      created_at: string;
      plant_species: {
        name: string;
        maturation_years: number;
      };
    }>;
    notifications: Array<{
      id: string;
      user_id: string;
      title: string;
      message: string;
      type: string;
      read: boolean;
      created_at: string;
    }>;
  };
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function useDemo() {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(() => {
    return localStorage.getItem('demo_mode') === 'true';
  });

  const demoData = {
    user: {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'demo@gaveagro.com',
      name: 'Usuario Demo',
      role: 'demo' as const,
      account_balance: 500000,
      phone: '+52 555 123 4567',
    },
    investments: [
      {
        id: '10000000-0000-0000-0000-000000000001',
        user_id: '00000000-0000-0000-0000-000000000001',
        species_id: 'demo-species-1',
        plant_count: 2500,
        total_amount: 750000,
        price_per_plant: 300,
        plantation_year: 2020,
        expected_harvest_year: 2028,
        weight_per_plant_kg: 50,
        status: 'active',
        created_at: '2020-03-15T10:00:00Z',
        plant_species: {
          name: 'Agave Azul Tequilana',
          maturation_years: 8,
        },
      },
      {
        id: '10000000-0000-0000-0000-000000000002',
        user_id: '00000000-0000-0000-0000-000000000001',
        species_id: 'demo-species-1',
        plant_count: 1800,
        total_amount: 540000,
        price_per_plant: 300,
        plantation_year: 2022,
        expected_harvest_year: 2030,
        weight_per_plant_kg: 50,
        status: 'active',
        created_at: '2022-07-20T14:30:00Z',
        plant_species: {
          name: 'Agave Azul Tequilana',
          maturation_years: 8,
        },
      },
      {
        id: '10000000-0000-0000-0000-000000000003',
        user_id: '00000000-0000-0000-0000-000000000001',
        species_id: 'demo-species-2',
        plant_count: 3200,
        total_amount: 960000,
        price_per_plant: 300,
        plantation_year: 2021,
        expected_harvest_year: 2029,
        weight_per_plant_kg: 50,
        status: 'active',
        created_at: '2021-11-10T09:15:00Z',
        plant_species: {
          name: 'Agave Americana',
          maturation_years: 8,
        },
      },
    ],
    notifications: [
      {
        id: '20000000-0000-0000-0000-000000000001',
        user_id: '00000000-0000-0000-0000-000000000001',
        title: 'Bienvenido al Demo de Gavé',
        message: 'Este es un panel de demostración con datos ficticios para que explores nuestras funcionalidades.',
        type: 'info',
        read: false,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '20000000-0000-0000-0000-000000000002',
        user_id: '00000000-0000-0000-0000-000000000001',
        title: 'Inversión Demo Actualizada',
        message: 'Tus plantaciones de demostración están creciendo según lo esperado. El progreso se actualiza automáticamente.',
        type: 'success',
        read: false,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  };

  const setDemoMode = (demo: boolean) => {
    setIsDemoMode(demo);
    if (demo) {
      localStorage.setItem('demo_mode', 'true');
    } else {
      localStorage.removeItem('demo_mode');
    }
  };

  // Listen for demo mode changes from localStorage
  useEffect(() => {
    const checkDemoMode = () => {
      const demoMode = localStorage.getItem('demo_mode') === 'true';
      if (demoMode !== isDemoMode) {
        setIsDemoMode(demoMode);
      }
    };

    const handleDemoModeChange = (event: CustomEvent) => {
      setIsDemoMode(event.detail.isDemoMode);
    };

    // Check on window focus (in case another tab changed it)
    window.addEventListener('focus', checkDemoMode);
    window.addEventListener('demo-mode-changed', handleDemoModeChange as EventListener);
    
    return () => {
      window.removeEventListener('focus', checkDemoMode);
      window.removeEventListener('demo-mode-changed', handleDemoModeChange as EventListener);
    };
  }, [isDemoMode]);

  const value = {
    isDemoMode,
    setDemoMode,
    demoData,
  };

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  );
}