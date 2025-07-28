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
    'nav.simulator': 'Simula tu Próxima Inversión',
    'nav.investments': 'Mis Inversiones',
    'nav.plots': 'Parcelas',
    
    'nav.admin': 'Administración',
    
    // Dashboard
    'dashboard.welcome': 'Bienvenido a tu Dashboard',
    'dashboard.portfolio': 'Tu portafolio',
    'dashboard.portfolioDesc': 'Invierte en el futuro del planeta, cosecha prosperidad',
    'dashboard.newInvestment': 'Nueva Inversión',
    'dashboard.establishedPlants': 'Plantas Establecidas',
    'dashboard.agavesGrowing': 'agaves creciendo para ti',
    'dashboard.totalInvestment': 'Inversión Total',
    'dashboard.investedCapital': 'capital invertido',
    'dashboard.co2Captured': 'CO₂ Secuestrado',
    'dashboard.positiveImpact': 'impacto ambiental positivo',
    'dashboard.nextHarvest': 'Próxima Cosecha',
    'dashboard.totalPlants': 'Total de Plantas',
    'dashboard.estimatedHarvest': 'Próxima Cosecha',
    'dashboard.noActiveInvestments': 'Sin inversiones activas',
    'dashboard.generalProgress': 'Progreso General',
    'dashboard.avgMaturation': 'Estado promedio de maduración',
    'dashboard.avgMaturity': 'madurez promedio',
    'dashboard.progressByInvestment': 'Progreso por Inversión',
    'dashboard.maturationStatus': 'Estado de maduración de tus plantaciones',
    'dashboard.readyForHarvest': '¡Listo para cosecha!',
    'dashboard.startForestJourney': 'Comienza tu Viaje Forestal',
    'dashboard.noInvestmentsDesc': 'Aún no tienes inversiones. ¡Empieza hoy y contribuye al cuidado del medio ambiente mientras generas rendimientos!',
    'dashboard.firstInvestment': 'Mi Primera Inversión',
    'dashboard.requestNewInvestment': 'Solicitar Nueva Inversión',
    'dashboard.newInvestmentDesc': 'Envía una solicitud para una nueva inversión forestal. Nuestro equipo revisará tu solicitud y se pondrá en contacto contigo.',
    'dashboard.fullName': 'Nombre completo',
    'dashboard.phone': 'Teléfono',
    'dashboard.species': 'Especie',
    'dashboard.selectSpecies': 'Selecciona una especie',
    'dashboard.plantCount': 'Cantidad de plantas',
    'dashboard.establishmentYear': 'Año de establecimiento',
    'dashboard.totalInvestmentAmount': 'Inversión total',
    'dashboard.cancel': 'Cancelar',
    'dashboard.sendRequest': 'Enviar Solicitud',
    'dashboard.requestSent': 'Solicitud enviada',
    'dashboard.requestSuccess': 'Tu solicitud de inversión ha sido enviada correctamente',
    
    // Simulator
    'simulator.title': 'Simulador de Inversión Gavé',
    'simulator.description': 'Calcula el retorno de tu inversión en plantaciones de agave para producción de mezcal',
    'simulator.configTitle': 'Configuración de Inversión',
    'simulator.configDesc': 'Ajusta los parámetros para calcular tu inversión',
    'simulator.species': 'Especie de Agave',
    'simulator.selectSpecies': 'Selecciona una especie',
    'simulator.year': 'Año de Establecimiento',
    'simulator.selectYear': 'Selecciona un año',
    'simulator.plants': 'Número de Plantas',
    'simulator.plantsRange': 'Mínimo 1, máximo 1,000 plantas',
    'simulator.weightPerPlant': 'Peso Esperado por Planta',
    'simulator.weightPerPlantUnit': 'kg por planta',
    'simulator.pricePerKg': 'Precio Esperado por Kg de Agave',
    'simulator.pricePerKgUnit': 'por kg',
    'simulator.initialInvestment': 'Inversión Inicial',
    'simulator.finalReturn': 'Retorno Final',
    'simulator.returnDesc': 'Inversión + 65% de utilidades',
    'simulator.netProfit': 'Ganancia Neta',
    'simulator.harvestBreakdown': 'Desglose de Cosecha',
    'simulator.totalWeight': 'Peso total:',
    'simulator.grossValue': 'Valor bruto:',
    'simulator.maturationTime': 'Tiempo de Maduración',
    'simulator.years': 'años',
    'simulator.harvestDate': 'Fecha estimada de cosecha',
    'simulator.environmentalImpact': 'Impacto Ambiental',
    'simulator.carbonCapture': 'Captura de CO₂',
    'simulator.proceed': 'Proceder con esta Inversión',
    'simulator.accessRequired': 'Acceso requerido',
    'simulator.loginRequired': 'Debes iniciar sesión para proceder con la inversión',
    'simulator.requestSent': 'Solicitud enviada',
    'simulator.requestDesc': 'Hemos recibido tu interés en esta inversión. Nos pondremos en contacto contigo pronto.',
    'simulator.requestError': 'No se pudo enviar la solicitud. Intenta nuevamente.',
    
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
    'auth.description': 'Accede a tu panel de inversiones',
    'auth.emailPlaceholder': 'tu@email.com',
    'auth.noAccess': '¿No tienes acceso?',
    'auth.contactAdmin': 'Contacta al administrador para obtener una cuenta.',
    
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
    
    
    // Investments 
    'investments.title': 'Mis Inversiones',
    'investments.description': 'Visualiza y rastrea tus inversiones forestales',
    'investments.valuationCalculator': 'Calculadora de Valuación',
    'investments.inputParameters': 'Parámetros de Entrada',
    'investments.estimatedPricePerKg': 'Precio por kg estimado:',
    'investments.weightPerPlant': 'Peso por planta:',
    'investments.yourInvestmentData': 'Datos de tu Inversión',
    'investments.plants': 'Plantas',
    'investments.pricePaidPerPlant': 'Precio pagado/planta',
    'investments.totalInvestment': 'Inversión total',
    'investments.valuationProjection': 'Proyección de Valuación',
    'investments.totalEstimatedWeight': 'Peso total estimado',
    'investments.grossRevenue': 'Ingreso bruto',
    'investments.gaveCommission': 'Comisión Gavé (15%)',
    'investments.netRevenue': 'Ingreso neto',
    'investments.initialInvestment': 'Inversión inicial',
    'investments.totalProfit': 'Ganancia total',
    'investments.roi': 'ROI',
    'investments.calculatorNote': 'Estos cálculos son estimaciones basadas en condiciones ideales de mercado. Los precios reales pueden variar según la oferta, demanda y calidad del producto al momento de la venta.',
  },
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.simulator': 'Simulate your Next Investment',
    'nav.investments': 'My Investments',
    'nav.plots': 'Plots',
    
    'nav.admin': 'Administration',
    
    // Dashboard
    'dashboard.welcome': 'Welcome to your Dashboard',
    'dashboard.portfolio': 'Your portfolio',
    'dashboard.portfolioDesc': 'Invest in the planet\'s future, harvest prosperity',
    'dashboard.newInvestment': 'New Investment',
    'dashboard.establishedPlants': 'Established Plants',
    'dashboard.agavesGrowing': 'agaves growing for you',
    'dashboard.totalInvestment': 'Total Investment',
    'dashboard.investedCapital': 'invested capital',
    'dashboard.co2Captured': 'CO₂ Captured',
    'dashboard.positiveImpact': 'positive environmental impact',
    'dashboard.nextHarvest': 'Next Harvest',
    'dashboard.totalPlants': 'Total Plants',
    'dashboard.estimatedHarvest': 'Next Harvest',
    'dashboard.noActiveInvestments': 'No active investments',
    'dashboard.generalProgress': 'General Progress',
    'dashboard.avgMaturation': 'Average maturation status',
    'dashboard.avgMaturity': 'average maturity',
    'dashboard.progressByInvestment': 'Progress by Investment',
    'dashboard.maturationStatus': 'Maturation status of your plantations',
    'dashboard.readyForHarvest': 'Ready for harvest!',
    'dashboard.startForestJourney': 'Start your Forest Journey',
    'dashboard.noInvestmentsDesc': 'You don\'t have investments yet. Start today and contribute to environmental care while generating returns!',
    'dashboard.firstInvestment': 'My First Investment',
    'dashboard.requestNewInvestment': 'Request New Investment',
    'dashboard.newInvestmentDesc': 'Send a request for a new forest investment. Our team will review your request and contact you.',
    'dashboard.fullName': 'Full name',
    'dashboard.phone': 'Phone',
    'dashboard.species': 'Species',
    'dashboard.selectSpecies': 'Select a species',
    'dashboard.plantCount': 'Number of plants',
    'dashboard.establishmentYear': 'Establishment year',
    'dashboard.totalInvestmentAmount': 'Total investment',
    'dashboard.cancel': 'Cancel',
    'dashboard.sendRequest': 'Send Request',
    'dashboard.requestSent': 'Request sent',
    'dashboard.requestSuccess': 'Your investment request has been sent successfully',
    
    // Simulator
    'simulator.title': 'Gavé Investment Simulator',
    'simulator.description': 'Calculate the return on your agave plantation investment for mezcal production',
    'simulator.configTitle': 'Investment Configuration',
    'simulator.configDesc': 'Adjust parameters to calculate your investment',
    'simulator.species': 'Agave Species',
    'simulator.selectSpecies': 'Select a species',
    'simulator.year': 'Establishment Year',
    'simulator.selectYear': 'Select a year',
    'simulator.plants': 'Number of Plants',
    'simulator.plantsRange': 'Minimum 1, maximum 1,000 plants',
    'simulator.weightPerPlant': 'Expected Weight per Plant',
    'simulator.weightPerPlantUnit': 'kg per plant',
    'simulator.pricePerKg': 'Expected Price per Kg of Agave',
    'simulator.pricePerKgUnit': 'per kg',
    'simulator.initialInvestment': 'Initial Investment',
    'simulator.finalReturn': 'Final Return',
    'simulator.returnDesc': 'Investment + 65% of profits',
    'simulator.netProfit': 'Net Profit',
    'simulator.harvestBreakdown': 'Harvest Breakdown',
    'simulator.totalWeight': 'Total weight:',
    'simulator.grossValue': 'Gross value:',
    'simulator.maturationTime': 'Maturation Time',
    'simulator.years': 'years',
    'simulator.harvestDate': 'Estimated harvest date',
    'simulator.environmentalImpact': 'Environmental Impact',
    'simulator.carbonCapture': 'CO₂ Capture',
    'simulator.proceed': 'Proceed with this Investment',
    'simulator.accessRequired': 'Access required',
    'simulator.loginRequired': 'You must sign in to proceed with the investment',
    'simulator.requestSent': 'Request sent',
    'simulator.requestDesc': 'We have received your interest in this investment. We will contact you soon.',
    'simulator.requestError': 'Could not send request. Please try again.',
    
    // Documents
    'documents.title': 'My Documents',
    'documents.description': 'Documents related to your investments and contracts',
    'documents.contract': 'Contract',
    'documents.report': 'Report',
    'documents.date': 'Date',
    'documents.size': 'Size',
    'documents.type': 'Type',
    'documents.download': 'Download',
    'documents.active': 'Active',
    'documents.pending': 'Pending',
    'documents.noDocuments': 'No documents available',
    'documents.noDocumentsDesc': 'Documents related to your investments will appear here once processed.',
    'documents.info': 'Document Information',
    'documents.infoDesc': 'Everything you need to know about your documents',
    'documents.contractsTitle': 'Purchase Contracts',
    'documents.contractsDesc': 'Legal documents that formalize your plant investment. Generated automatically after each approved purchase.',
    'documents.reportsTitle': 'Annual Reports',
    'documents.reportsDesc': 'Technical and market reports on plot status and growth projections for your plants.',
    
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
    'auth.description': 'Access your investment panel',
    'auth.emailPlaceholder': 'your@email.com',
    'auth.noAccess': 'Don\'t have access?',
    'auth.contactAdmin': 'Contact the administrator to get an account.',
    
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

    
    // Investments 
    'investments.title': 'My Investments',
    'investments.description': 'View and track your forest investments',
    'investments.valuationCalculator': 'Valuation Calculator',
    'investments.inputParameters': 'Input Parameters',
    'investments.estimatedPricePerKg': 'Estimated price per kg:',
    'investments.weightPerPlant': 'Weight per plant:',
    'investments.yourInvestmentData': 'Your Investment Data',
    'investments.plants': 'Plants',
    'investments.pricePaidPerPlant': 'Price paid/plant',
    'investments.totalInvestment': 'Total investment',
    'investments.valuationProjection': 'Valuation Projection',
    'investments.totalEstimatedWeight': 'Total estimated weight',
    'investments.grossRevenue': 'Gross revenue',
    'investments.gaveCommission': 'Gavé Commission (15%)',
    'investments.netRevenue': 'Net revenue',
    'investments.initialInvestment': 'Initial investment',
    'investments.totalProfit': 'Total profit',
    'investments.roi': 'ROI',
    'investments.calculatorNote': 'These calculations are estimates based on ideal market conditions. Actual prices may vary depending on supply, demand and product quality at the time of sale.',
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
  const [language, setLanguage] = useState<Language>(() => {
    // Try to get language from localStorage, default to 'es'
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('language') as Language) || 'es';
    }
    return 'es';
  });

  // Save language to localStorage when it changes
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', language);
    }
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}