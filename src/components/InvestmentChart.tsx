import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface InvestmentData {
  species: string;
  amount: number;
  count: number;
  year: number;
}

interface InvestmentChartProps {
  investments: InvestmentData[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const InvestmentChart = ({ investments }: InvestmentChartProps) => {
  if (investments.length <= 1) {
    return null;
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={investments}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ species, percent }) => `${species} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="amount"
          >
            {investments.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Inversión']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};