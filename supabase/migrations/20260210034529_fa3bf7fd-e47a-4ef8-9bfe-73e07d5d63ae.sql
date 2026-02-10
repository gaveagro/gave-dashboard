
INSERT INTO public.land_leases (owner_name, area_hectares, cost_per_hectare_year, annual_rent, location, start_date, end_date, payment_frequency, outstanding_balance, notes, plantation_year, status) VALUES
-- Grupo 1: La Caldera, Aquismon
('Martin Melendrez', 1, 6000, 6000, 'La Caldera, Aquismon', '2021-10-01', '2027-10-01', 'Anual', 6000, 'Renta vencida Oct 2025', 2021, 'active'),
('Maricela Anastacio', 1, 6000, 6000, 'La Caldera, Aquismon', '2021-10-01', '2027-10-01', 'Anual', 6000, 'Renta vencida Oct 2025', 2021, 'active'),
('Roberto Lucas', 1, 6000, 6000, 'La Caldera, Aquismon', '2021-10-01', '2027-10-01', 'Anual', 6000, 'Renta vencida Oct 2025', 2021, 'active'),
('Valentin Anastacio', 0.75, 6666.67, 5000, 'La Caldera, Aquismon', '2021-10-01', '2027-10-01', 'Anual', 5000, 'Renta vencida Oct 2025', 2021, 'active'),
('Obispo Anastacio', 0.75, 6666.67, 5000, 'La Caldera, Aquismon', '2021-10-01', '2027-10-01', 'Anual', 5000, 'Renta vencida Oct 2025', 2021, 'active'),
('Josefina Lucas', 4, 6000, 24000, 'La Caldera, Aquismon', '2023-09-01', '2030-09-01', 'Anual', 24000, 'Renta vencida Oct 2025', 2023, 'active'),
('Santos Liborio', 1, 12500, 12500, 'La Caldera, Aquismon', '2021-10-01', '2027-10-01', 'Anual', 12500, 'Renta vencida Oct 2025', 2021, 'active'),
-- Grupo 1b: El Sabinal, Aquismon
('Benito Lucas', 0.7, 7857.14, 5500, 'El Sabinal, Aquismon', '2023-04-01', '2029-04-01', 'Anual', 5500, NULL, 2023, 'active'),
-- Grupo 2: Tanchachin, Aquismon
('Melany Marquez Aguilar', 2, 12000, 24000, 'Tanchachin, Aquismon', '2022-09-22', '2028-09-22', 'Cada 6 meses', 0, NULL, 2022, 'active'),
('Martin Marquez Aguilar', 1, 18000, 18000, 'Tanchachin, Aquismon', '2022-06-01', '2028-06-01', 'Mensual', 0, NULL, 2022, 'active'),
('Martin Marquez Aguilar', 1.5, 20000, 30000, 'Tanchachin, Aquismon', '2020-09-01', '2023-09-01', 'Cada 6 meses', 0, 'Contrato expirado Sep 2023', 2020, 'expired'),
('Martin Marquez Aguilar', 3.63, 9917.36, 36000, 'Tanchachin, Aquismon', '2020-08-01', '2023-08-01', 'Cada 6 meses', 0, 'Contrato expirado Ago 2023', 2020, 'expired'),
-- Grupo 3: Santa Anita
('Pablo Simon', 4, 5500, 22000, 'Santa Anita', '2023-04-30', '2029-04-30', 'Anual', 60000, 'Pago parcial en 2023, faltan 2024 y 2025', 2023, 'active'),
('Miguel Guzman', 3, 5500, 16500, 'Santa Anita', '2023-04-30', '2029-04-30', 'Anual', 43500, 'Pago parcial en 2023, faltan 2024 y 2025', 2023, 'active'),
-- Grupo 4: Ebano
('Miguel Avila Garcia', 4, 1800, 7200, 'Ebano', '2021-07-10', '2027-07-10', 'Anual', 11000, 'A partir de julio 2026 seran $18,200', 2021, 'active'),
('Carlos Milan Lopez', 5, 2000, 10000, 'Ebano', '2021-06-01', '2027-06-01', 'Anual', 7000, 'A partir de junio 2026 seran $17,000', 2021, 'active'),
('Francisco Jimenez Santillan', 2, 1800, 3600, 'Ebano', '2021-07-10', '2027-07-10', 'Anual', 13200, 'A partir de junio 2026 seran $26,400', 2021, 'active'),
('Ana Laura', 10, 1800, 18000, 'Ebano', '2021-07-10', '2027-07-10', 'Anual', 0, 'Todo pagado hasta julio 2027', 2021, 'active'),
-- Grupo 5: Predios sin renta
('Mauricio Olivares', 3, 0, 0, 'Ojo Caliente, Tamasopo', NULL, NULL, 'Anual', 0, 'Predio sin renta', 2023, 'active'),
('Arturo Segoviano', 8, 0, 0, 'Pozo de Luna, Soledad de Graciano Sanchez', NULL, NULL, 'Anual', 0, 'Predio sin renta', 2021, 'active'),
('Arturo Segoviano', 10, 0, 0, 'El Carpintero, Tamasopo', NULL, NULL, 'Anual', 0, 'Predio sin renta', 2023, 'active');
