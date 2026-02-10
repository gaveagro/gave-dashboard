
-- Create land_leases table
CREATE TABLE public.land_leases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plantation_year INTEGER,
  area_hectares NUMERIC(10,2),
  cost_per_hectare_year NUMERIC(12,2),
  annual_rent NUMERIC(12,2),
  owner_name TEXT NOT NULL,
  location TEXT,
  start_date DATE,
  end_date DATE,
  payment_frequency TEXT DEFAULT 'Anual',
  outstanding_balance NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  species_name TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.land_leases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all leases"
ON public.land_leases
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create lease_payments table
CREATE TABLE public.lease_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_id UUID NOT NULL REFERENCES public.land_leases(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_covered TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lease_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all lease payments"
ON public.lease_payments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger for land_leases
CREATE TRIGGER update_land_leases_updated_at
BEFORE UPDATE ON public.land_leases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert CSV data
INSERT INTO public.land_leases (plantation_year, area_hectares, cost_per_hectare_year, annual_rent, owner_name, location, start_date, end_date, payment_frequency, outstanding_balance, notes, status) VALUES
(2021, 30.00, 3500.00, 105000.00, 'J. Refugio Calderón M.', 'La Estancia, Ameca', '2021-04-01', '2026-10-01', 'Anual', 105000.00, 'Pago anual. El Refugio. Vence Oct 2026. Prioridad ALTA - próximo a cosecha.', 'active'),
(2021, 20.00, 3500.00, 70000.00, 'J. Refugio Calderón M.', 'La Estancia, Ameca', '2021-04-01', '2026-10-01', 'Anual', 70000.00, 'Pago anual. El Refugio (segundo predio). Vence Oct 2026. Prioridad ALTA.', 'active'),
(2022, 30.00, 3500.00, 105000.00, 'Familia López', 'La Villita, Ameca', '2022-10-01', '2027-10-01', 'Anual', 105000.00, 'Pago anual en octubre. La Villita.', 'active'),
(2022, 30.00, 3500.00, 105000.00, 'Ma. del Refugio Castañeda', 'La Villita, Ameca', '2022-10-01', '2027-10-01', 'Anual', 105000.00, 'Pago anual en octubre.', 'active'),
(2022, 30.00, 2857.00, 85710.00, 'Ignacio de la Cruz', 'El Cabezón, Ameca', '2022-10-01', '2027-10-01', 'Anual', 85710.00, 'Pago anual en octubre. El Cabezón.', 'active'),
(2023, 12.00, 4166.67, 50000.00, 'Ignacio de la Cruz', 'El Cabezón, Ameca', '2023-04-01', '2028-10-01', 'Anual', 50000.00, 'Pago anual. Segundo predio en El Cabezón.', 'active'),
(2023, 30.00, 3500.00, 105000.00, 'Rosalío Amezcua', 'La Estancia, Ameca', '2023-04-01', '2028-10-01', 'Anual', 105000.00, 'Pago anual. La Estancia.', 'active'),
(2023, 60.00, 2500.00, 150000.00, 'Rafael Reynoso / Rosalío', 'El Zapote - Santa Rosa', '2023-04-01', '2028-10-01', 'Cada 6 meses', 150000.00, 'Pago cada 6 meses. $75,000 por semestre. El Zapote.', 'active'),
(2023, 30.00, 3500.00, 105000.00, 'Hilario Arambula', 'La Estancia, Ameca', '2023-04-01', '2028-10-01', 'Anual', 105000.00, 'Pago anual. La Estancia.', 'active'),
(2024, 70.00, 3571.43, 250000.00, 'Familia Martínez', 'La Villita, Ameca', '2024-04-01', '2029-10-01', 'Anual', 250000.00, 'Pago anual. La Villita. 70 hectáreas.', 'active'),
(2024, 25.00, 4000.00, 100000.00, 'Fernando Amezcua', 'El Zapote - Santa Rosa', '2024-04-01', '2029-10-01', 'Anual', 100000.00, 'Pago anual. El Zapote.', 'active'),
(2024, 20.00, 5000.00, 100000.00, 'Abundio Domínguez', 'El Zapote - Santa Rosa', '2024-04-01', '2029-10-01', 'Cada 6 meses', 100000.00, 'Pago cada 6 meses. $50,000 por semestre. El Zapote.', 'active'),
(2024, 15.00, 5333.33, 80000.00, 'Ma. del Refugio Castañeda', 'La Villita, Ameca', '2024-04-01', '2029-10-01', 'Anual', 80000.00, 'Segundo predio. Pago anual. La Villita.', 'active'),
(2024, 25.00, 4000.00, 100000.00, 'Andrés Arellano', 'La Villita, Ameca', '2024-10-01', '2029-10-01', 'Anual', 100000.00, 'Pago anual en octubre. La Villita.', 'active'),
(2024, 30.00, 3000.00, 90000.00, 'Arturo Rodríguez', 'El Cabezón, Ameca', '2024-04-01', '2029-10-01', 'Anual', 90000.00, 'Pago anual. El Cabezón.', 'active'),
(2024, 10.00, 5000.00, 50000.00, 'Familia Hernández', 'Mezquitán, Ameca', '2024-04-01', '2029-10-01', 'Anual', 50000.00, 'Pago anual. Mezquitán.', 'active'),
(2025, 30.00, 3333.33, 100000.00, 'Familia Amezcua', 'El Zapote - Santa Rosa', '2025-04-01', '2030-10-01', 'Anual', 0.00, 'Pago anual. Nueva renta 2025. Pagada.', 'active'),
(2025, 50.00, 3400.00, 170000.00, 'Familia Reynoso', 'Santa Rosa, Ameca', '2025-04-01', '2030-10-01', 'Anual', 170000.00, 'Pago anual. Santa Rosa. 50 hectáreas.', 'active'),
(2025, 40.00, 3750.00, 150000.00, 'Familia Calderón', 'La Estancia, Ameca', '2025-04-01', '2030-10-01', 'Cada 6 meses', 150000.00, 'Pago cada 6 meses. $75,000 por semestre. La Estancia.', 'active'),
(2025, 20.00, 4000.00, 80000.00, 'Familia López', 'La Villita, Ameca', '2025-10-01', '2030-10-01', 'Anual', 80000.00, 'Pago anual en octubre. La Villita. Nueva renta.', 'active');
