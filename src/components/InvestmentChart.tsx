import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface InvestmentData {
  species: string;
  amount: number;
  count: number;
  year: number;
}

interface InvestmentChartProps {
  investments: InvestmentData[];
}

const COLORS = [
  '#16a34a', // Green
  '#0284c7', // Blue
  '#6d28d9', // Purple
  '#ea580c', // Orange
  '#d946ef', // Pink
  '#0d9488', // Teal
  '#f59e0b', // Amber
  '#a855f7', // Violet
  '#0891b2', // Cyan
  '#dc2626', // Red
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium">{data.name}</p>
        <p className="text-primary">
          <span className="font-semibold">${data.value.toLocaleString()}</span> invertido
        </p>
        <p className="text-sm text-muted-foreground">
          {data.payload.count} plantas
        </p>
      </div>
    );
  }
  return null;
};

export const InvestmentChart = ({ investments }: InvestmentChartProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  if (investments.length <= 1) {
    return null;
  }

  // Datos por especies
  const speciesData = investments.reduce((acc: any[], inv) => {
    const existing = acc.find(item => item.name === inv.species);
    if (existing) {
      existing.value += inv.amount;
      existing.count += inv.count;
    } else {
      acc.push({
        name: inv.species,
        value: inv.amount,
        count: inv.count
      });
    }
    return acc;
  }, []);

  // Datos por años con desglose de especies
  const yearSpeciesData = investments.reduce((acc: any[], inv) => {
    const yearKey = inv.year.toString();
    const existingYear = acc.find(item => item.year === yearKey);
    
    if (existingYear) {
      existingYear.totalValue += inv.amount;
      existingYear.totalCount += inv.count;
      
      const existingSpecies = existingYear.species.find((s: any) => s.name === inv.species);
      if (existingSpecies) {
        existingSpecies.value += inv.amount;
        existingSpecies.count += inv.count;
      } else {
        existingYear.species.push({
          name: inv.species,
          value: inv.amount,
          count: inv.count
        });
      }
    } else {
      acc.push({
        year: yearKey,
        totalValue: inv.amount,
        totalCount: inv.count,
        species: [{
          name: inv.species,
          value: inv.amount,
          count: inv.count
        }]
      });
    }
    return acc;
  }, []);

  // Datos para el gráfico de barras (años)
  const yearData = yearSpeciesData.map(year => ({
    name: year.year,
    value: year.totalValue,
    count: year.totalCount
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
       {/* Chart por Especies */}
       <div className="space-y-4">
         <h3 className="text-lg font-semibold text-center">Distribución por Especies</h3>
         <div className="h-80">
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={speciesData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
               <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
               <XAxis 
                 type="number" 
                 className="text-sm"
                 tick={{ fontSize: 12 }}
                 tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
               />
               <YAxis 
                 dataKey="name" 
                 type="category" 
                 className="text-sm"
                 tick={{ fontSize: 12 }}
                 width={100}
               />
               <Tooltip content={<CustomTooltip />} />
               <Bar 
                 dataKey="value" 
                 radius={[0, 4, 4, 0]}
                 className="drop-shadow-sm"
               >
                 {speciesData.map((entry, index) => (
                   <Cell 
                     key={`cell-${index}`} 
                     fill={COLORS[index % COLORS.length]}
                     className="hover:opacity-80 transition-opacity cursor-pointer"
                   />
                 ))}
               </Bar>
             </BarChart>
           </ResponsiveContainer>
         </div>
         <div className="flex flex-wrap justify-center gap-3">
           {speciesData.map((entry, index) => (
             <div key={entry.name} className="flex items-center gap-2">
               <div 
                 className="w-3 h-3 rounded-full" 
                 style={{ backgroundColor: COLORS[index % COLORS.length] }}
               />
               <span className="text-sm font-medium">{entry.name}</span>
             </div>
           ))}
         </div>
      </div>

      {/* Chart por Años con desglose */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-center">Distribución por Años de Establecimiento</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yearData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="name" 
                className="text-sm"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-sm"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="value" 
                radius={[4, 4, 0, 0]}
                className="drop-shadow-sm"
              >
                {yearData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Desglose por especies en cada año */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Desglose por especies:</h4>
          {yearSpeciesData.map((yearData, yearIndex) => (
            <div key={yearData.year} className="bg-muted/30 p-3 rounded-lg">
              <div className="font-medium text-sm mb-2">
                Año {yearData.year} - {formatCurrency(yearData.totalValue)} ({yearData.totalCount.toLocaleString()} plantas)
              </div>
              <div className="grid grid-cols-1 gap-2">
                {yearData.species.map((species: any, speciesIndex: number) => (
                  <div key={species.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: COLORS[speciesIndex % COLORS.length] }}
                      />
                      <span>{species.name}</span>
                    </div>
                    <div className="text-muted-foreground">
                      {formatCurrency(species.value)} • {species.count.toLocaleString()} plantas
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};