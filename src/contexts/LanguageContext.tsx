import React, { createContext, useContext, useState } from 'react';

type Language = 'es' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  es: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.simulator': 'Simulador',
    'nav.investments': 'Mis Inversiones',
    'nav.plots': 'Parcelas',
    'nav.documents': 'Mis Documentos',
    'nav.admin': 'Administración',
    
    // Dashboard
    'dashboard.welcome': 'Bienvenido a tu Dashboard',
    'dashboard.currentValue': 'Valor Estimado a la Cosecha',
    'dashboard.totalInvestment': 'Inversión Total',
    'dashboard.totalPlants': 'Total de Plantas',
    'dashboard.estimatedHarvest': 'Próxima Cosecha',
    'dashboard.recentActivity': 'Actividad Reciente',
    'dashboard.portfolioOverview': 'Resumen de Portafolio',
    'dashboard.noInvestments': 'No tienes inversiones activas',
    'dashboard.getStarted': 'Comienza invirtiendo en el simulador',
    
    // Simulator
    'simulator.title': 'Simulador de Inversión',
    'simulator.description': 'Calcula el retorno de tu inversión en plantaciones de agave',
    'simulator.species': 'Especie',
    'simulator.year': 'Año de Establecimiento',
    'simulator.plants': 'Número de Plantas',
    'simulator.pricePerKg': 'Precio Esperado por Kg',
    'simulator.weightPerPlant': 'Peso por Planta (kg)',
    'simulator.initialInvestment': 'Inversión Inicial',
    'simulator.finalReturn': 'Retorno Final',
    'simulator.netProfit': 'Ganancia Neta',
    'simulator.harvestBreakdown': 'Desglose de Cosecha',
    'simulator.proceed': 'Proceder con esta Inversión',
    
    // Plots
    'plots.title': 'Parcelas de Cultivo',
    'plots.description': 'Información detallada sobre nuestras parcelas de agave en Oaxaca',
    'plots.totalPlots': 'Total Parcelas',
    'plots.totalArea': 'Área Total',
    'plots.totalPlants': 'Total Plantas',
    'plots.available': 'Disponibles',
    'plots.location': 'Ubicación',
    'plots.dronePhotos': 'Fotografías Aéreas',
    'plots.viewOnMap': 'Ver en Mapa',
    
    // Auth
    'auth.signIn': 'Iniciar Sesión',
    'auth.signUp': 'Registrarse',
    'auth.email': 'Correo Electrónico',
    'auth.password': 'Contraseña',
    'auth.name': 'Nombre',
    'auth.signOut': 'Cerrar Sesión',
    'auth.forgotPassword': '¿Olvidaste tu contraseña?',
    'auth.noAccount': '¿No tienes cuenta?',
    'auth.hasAccount': '¿Ya tienes cuenta?',
    'auth.signUpSuccess': 'Registro exitoso',
    'auth.checkEmail': 'Por favor verifica tu correo electrónico para completar el registro',
    'auth.resetEmailSent': 'Correo de restablecimiento enviado',
    'auth.checkEmailForReset': 'Revisa tu correo para restablecer tu contraseña',
    'auth.enterEmailFirst': 'Por favor ingresa tu correo electrónico primero',
    
    // Common
    'common.loading': 'Cargando...',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.edit': 'Editar',
    'common.delete': 'Eliminar',
    'common.view': 'Ver',
    'common.close': 'Cerrar',
    'common.language': 'Idioma',
    'common.spanish': 'Español',
    'common.english': 'English',
  },
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.simulator': 'Simulator',
    'nav.investments': 'My Investments',
    'nav.plots': 'Plots',
    'nav.documents': 'My Documents',
    'nav.admin': 'Administration',
    
    // Dashboard
    'dashboard.welcome': 'Welcome to your Dashboard',
    'dashboard.currentValue': 'Estimated Harvest Value',
    'dashboard.totalInvestment': 'Total Investment',
    'dashboard.totalPlants': 'Total Plants',
    'dashboard.estimatedHarvest': 'Next Harvest',
    'dashboard.recentActivity': 'Recent Activity',
    'dashboard.portfolioOverview': 'Portfolio Overview',
    'dashboard.noInvestments': 'No active investments',
    'dashboard.getStarted': 'Get started by investing in the simulator',
    
    // Simulator
    'simulator.title': 'Investment Simulator',
    'simulator.description': 'Calculate the return on your agave plantation investment',
    'simulator.species': 'Species',
    'simulator.year': 'Establishment Year',
    'simulator.plants': 'Number of Plants',
    'simulator.pricePerKg': 'Expected Price per Kg',
    'simulator.weightPerPlant': 'Weight per Plant (kg)',
    'simulator.initialInvestment': 'Initial Investment',
    'simulator.finalReturn': 'Final Return',
    'simulator.netProfit': 'Net Profit',
    'simulator.harvestBreakdown': 'Harvest Breakdown',
    'simulator.proceed': 'Proceed with this Investment',
    
    // Plots
    'plots.title': 'Cultivation Plots',
    'plots.description': 'Detailed information about our agave plots in Oaxaca',
    'plots.totalPlots': 'Total Plots',
    'plots.totalArea': 'Total Area',
    'plots.totalPlants': 'Total Plants',
    'plots.available': 'Available',
    'plots.location': 'Location',
    'plots.dronePhotos': 'Aerial Photos',
    'plots.viewOnMap': 'View on Map',
    
    // Auth
    'auth.signIn': 'Sign In',
    'auth.signUp': 'Sign Up',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.name': 'Name',
    'auth.signOut': 'Sign Out',
    'auth.forgotPassword': 'Forgot your password?',
    'auth.noAccount': "Don't have an account?",
    'auth.hasAccount': 'Already have an account?',
    'auth.signUpSuccess': 'Registration successful',
    'auth.checkEmail': 'Please check your email to complete registration',
    'auth.resetEmailSent': 'Reset email sent',
    'auth.checkEmailForReset': 'Check your email to reset your password',
    'auth.enterEmailFirst': 'Please enter your email address first',
    
    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.view': 'View',
    'common.close': 'Close',
    'common.language': 'Language',
    'common.spanish': 'Español',
    'common.english': 'English',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('es');

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}