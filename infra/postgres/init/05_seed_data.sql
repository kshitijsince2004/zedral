-- 05_seed_data.sql
-- Hero Steels Pilot Seed Data

-- ── Work Centres ────────────────────────────────────────────
INSERT INTO master.work_centres (wc_id, name, type, status, gauge_min_mm, gauge_max_mm, width_min_mm, width_max_mm) VALUES
  ('CRS-1', 'Cold Rolling Stand 1', 'Rolling',    'active',   0.3, 6.0, 600, 1500),
  ('CRS-2', 'Cold Rolling Stand 2', 'Rolling',    'active',   0.3, 6.0, 600, 1500),
  ('CRS-3', 'Cold Rolling Stand 3', 'Rolling',    'active',   0.3, 6.0, 600, 1500),
  ('PKL-1', 'Pickling Line 1',      'Processing', 'active',   NULL, NULL, NULL, NULL),
  ('ANN-1', 'Annealing Furnace 1',  'Processing', 'active',   NULL, NULL, NULL, NULL),
  ('RWD-1', 'Rewind Line 1',        'Processing', 'inactive', NULL, NULL, NULL, NULL)
ON CONFLICT (wc_id) DO NOTHING;

-- ── Shifts ──────────────────────────────────────────────────
INSERT INTO master.shifts (shift_id, name, start_time, end_time, linked_wc_ids) VALUES
  ('shift-A', 'A', '06:00', '14:00', '["CRS-1","CRS-2","PKL-1"]'),
  ('shift-B', 'B', '14:00', '22:00', '["CRS-2","CRS-3","ANN-1"]'),
  ('shift-C', 'C', '22:00', '06:00', '["CRS-1","CRS-3"]')
ON CONFLICT (shift_id) DO NOTHING;

-- ── Materials ───────────────────────────────────────────────
INSERT INTO master.materials (material_code, grade, gauge_mm, width_mm, type, status) VALUES
  ('HR-IS513-D-045-1250',     'IS513-D',      0.45, 1250, 'HR', 'active'),
  ('HR-IS5986-Fe410-080-1250','IS5986-Fe410', 0.80, 1250, 'HR', 'active'),
  ('HR-IS5986-Fe350-450-1050','IS5986-Fe350', 4.50, 1050, 'HR', 'active'),
  ('CR-IS513-CR2-060-1250',   'IS513-CR2',    0.60, 1250, 'CR', 'active'),
  ('CR-IS1079-D-100-1200',    'IS1079-D',     1.00, 1200, 'CR', 'active'),
  ('FG-IS513-CR4-050-1000',   'IS513-CR4',    0.50, 1000, 'FG', 'inactive')
ON CONFLICT (material_code) DO NOTHING;

-- ── Customers ───────────────────────────────────────────────
INSERT INTO master.customers (customer_id, name, priority, status) VALUES
  ('C-1001', 'Maruti Suzuki', 'high',   'active'),
  ('C-1002', 'Tata Motors',   'high',   'active'),
  ('C-1003', 'Mahindra',      'medium', 'active'),
  ('C-1004', 'JSW Auto',      'medium', 'active'),
  ('C-1005', 'Hyundai India', 'high',   'active'),
  ('C-1006', 'Ashok Leyland', 'low',    'inactive')
ON CONFLICT (customer_id) DO NOTHING;

-- ── Operators ───────────────────────────────────────────────
INSERT INTO master.operators (operator_id, name, skill, work_centre_id, shift_name, status) VALUES
  ('OP-2001', 'Ramesh Kumar',  'Senior', 'CRS-2', 'A', 'active'),
  ('OP-2002', 'Anil Verma',    'Mid',    'CRS-1', 'A', 'active'),
  ('OP-2003', 'Suresh Patil',  'Senior', 'CRS-3', 'B', 'active'),
  ('OP-2004', 'Deepak Joshi',  'Junior', 'PKL-1', 'A', 'active'),
  ('OP-2005', 'Pradeep Singh', 'Mid',    'ANN-1', 'B', 'inactive'),
  ('OP-2006', 'Vikram Rao',    'Junior', NULL,    NULL, 'active'),
  ('OP-2007', 'Manoj Shah',    'Mid',    NULL,    'C', 'active')
ON CONFLICT (operator_id) DO NOTHING;

-- ── Routings ────────────────────────────────────────────────
INSERT INTO master.routings (routing_id, material_code, wc_id, std_run_rate_mt_hr, setup_time_min, yield_pct, is_active) VALUES
  ('rt-001', 'CR-IS513-CR2-060-1250',    'CRS-1', 18, 45,  96, TRUE),
  ('rt-002', 'CR-IS513-CR2-060-1250',    'CRS-2', 17, 50,  95, TRUE),
  ('rt-003', 'CR-IS1079-D-100-1200',     'CRS-2', 22, 60,  94, TRUE),
  ('rt-004', 'HR-IS5986-Fe410-080-1250', 'PKL-1', 35, 30,  98, TRUE),
  ('rt-005', 'HR-IS5986-Fe350-450-1050', 'ANN-1', 12, 140, 99, TRUE)
ON CONFLICT (material_code, wc_id) DO NOTHING;

-- ── Changeover Matrix ───────────────────────────────────────
INSERT INTO master.changeover_matrix (wc_id, grade_from, grade_to, gauge_step, width_step, roll_change_reqd, setup_min) VALUES
  ('CRS-1', 'IS513-D',     'IS5986-Fe410', 'step_up',   'same',      TRUE,  140),
  ('CRS-1', 'IS5986-Fe410','IS513-D',      'step_down', 'same',      TRUE,  120),
  ('CRS-1', 'IS513-D',     'IS1079-D',     'step_up',   'reduction', FALSE, 60),
  ('CRS-2', 'IS513-D',     'IS5986-Fe410', 'step_up',   'same',      TRUE,  140),
  ('CRS-2', 'IS5986-Fe410','IS513-D',      'step_down', 'same',      TRUE,  120),
  ('CRS-2', 'IS513-D',     'IS1079-D',     'step_up',   'reduction', FALSE, 60),
  ('CRS-3', 'IS513-D',     'IS5986-Fe410', 'step_up',   'same',      TRUE,  140),
  ('CRS-3', 'IS5986-Fe410','IS5986-Fe350', 'step_up',   'reduction', FALSE, 45)
ON CONFLICT (wc_id, grade_from, grade_to, gauge_step, width_step) DO NOTHING;

-- ── Emission Factor (CEA FY26) ──────────────────────────────
INSERT INTO master.emission_factors (factor_id, factor_value, unit, source, effective_from) VALUES
  ('cea_fy26', 0.82000, 'kg CO2e/kWh', 'CEA FY26', '2025-04-01')
ON CONFLICT (factor_id) DO NOTHING;

-- ── M6 Config ───────────────────────────────────────────────
INSERT INTO m6_dispatch.config (config_key, config_value) VALUES
  ('downtime_categories',          '["breakdown","material_wait","quality_hold","tool_change","power","operator_break","other"]'),
  ('stoppage_reason_required_min', '5'),
  ('shift_start_times',            '{"A":"06:00","B":"14:00","C":"22:00"}'),
  ('dispatch_horizon_hours',       '24'),
  ('frozen_window_minutes',        '120'),
  ('rush_inject_requires_supervisor', 'true')
ON CONFLICT (config_key) DO NOTHING;

-- ── Sample Work Orders (matching frontend mock data) ────────
INSERT INTO m1_demand.work_orders (wo_id, sap_wo_ref, material_code, grade, gauge_mm, width_mm, qty_planned_mt, required_date, routing_id, routing_valid, priority_class, priority_score, wo_type, status, sap_modified_at) VALUES
  ('WO-1001', '1001', 'CR-IS513-CR2-060-1250',    'IS513-CR2',   0.60, 1250, 22.5, '2026-04-22', 'rt-001', TRUE,  'A', 95.0, 'customer', 'queued',    now()),
  ('WO-1002', '1002', 'CR-IS1079-D-100-1200',     'IS1079-D',    1.00, 1200, 18.0, '2026-04-25', 'rt-003', TRUE,  'B', 72.0, 'customer', 'queued',    now()),
  ('WO-1003', '1003', 'CR-IS513-CR2-060-1250',    'IS513-CR2',   0.60, 1250, 30.0, '2026-04-28', 'rt-001', TRUE,  'B', 65.0, 'customer', 'queued',    now()),
  ('WO-1004', '1004', 'HR-IS5986-Fe410-080-1250', 'IS5986-Fe410',0.80, 1250, 25.0, '2026-04-27', 'rt-004', TRUE,  'C', 55.0, 'customer', 'queued',    now()),
  ('WO-1005', '1005', 'CR-IS1079-D-100-1200',     'IS1079-D',    1.00, 1200, 25.5, '2026-04-30', 'rt-003', TRUE,  'B', 48.0, 'customer', 'queued',    now()),
  ('WO-1006', '1006', 'CR-IS513-CR2-060-1250',    'IS513-CR2',   0.60, 1250, 12.0, '2026-05-05', 'rt-001', TRUE,  'C', 35.0, 'customer', 'pending',   now()),
  ('WO-1007', '1007', 'CR-IS1079-D-100-1200',     'IS1079-D',    1.00, 1200, 20.0, '2026-05-08', 'rt-003', TRUE,  'C', 28.0, 'customer', 'pending',   now()),
  ('WO-1008', '1008', 'CR-IS513-CR2-060-1250',    'IS513-CR2',   0.60, 1250, 15.0, '2026-04-21', 'rt-001', TRUE,  'A', 98.0, 'customer', 'in_process',now())
ON CONFLICT (wo_id) DO NOTHING;

-- ── Sample Coils (matching frontend mock data) ──────────────
INSERT INTO m5a_material.coils (coil_id, material_code, grade, gauge_mm, width_mm, weight_initial_mt, weight_remaining_mt, heat_number, supplier, current_stage, reserved_for_wo, gr_date) VALUES
  ('coil_HR_298451', 'HR-IS5986-Fe410-080-1250', 'IS5986-Fe410', 4.0, 1250, 22.5, 22.5, 'H-2026-04-1234', 'JSW Steel',  'stores',   'WO-1001', '2026-04-18'),
  ('coil_HR_298452', 'HR-IS5986-Fe410-080-1250', 'IS5986-Fe410', 4.0, 1250, 15.0, 15.0, 'H-2026-04-1235', 'JSW Steel',  'stores',   'WO-1008', '2026-04-18'),
  ('coil_HR_298453', 'HR-IS5986-Fe410-080-1250', 'IS5986-Fe410', 3.5, 1200, 18.0, 18.0, 'H-2026-04-1230', 'SAIL',       'pickling', 'WO-1002', '2026-04-17'),
  ('coil_HR_298460', 'HR-IS5986-Fe350-450-1050', 'IS5986-Fe350', 4.5, 1050, 12.0, 12.0, 'H-2026-04-1201', 'Tata Steel', 'rolling',  NULL,      '2026-04-15'),
  ('coil_HR_298461', 'HR-IS5986-Fe350-450-1050', 'IS5986-Fe350', 4.5, 1050, 20.5, 20.5, 'H-2026-04-1198', 'JSW Steel',  'annealing',NULL,      '2026-04-14'),
  ('coil_HR_298470', 'HR-IS5986-Fe410-080-1250', 'IS5986-Fe410', 3.0,  900,  8.0,  8.0, 'H-2026-04-1240', 'SAIL',       'stores',   NULL,      '2026-04-19'),
  ('coil_HR_298480', 'HR-IS5986-Fe350-450-1050', 'IS5986-Fe350', 5.0, 1150, 25.0, 25.0, 'H-2026-04-1222', 'SAIL',       'stores',   NULL,      '2026-04-19'),
  ('coil_CR_298451_001', 'CR-IS513-CR2-060-1250','IS513-CR2',    0.6, 1250, 22.0, 21.8, 'H-2026-04-1234', 'Hero Steel', 'fg',       NULL,      '2026-04-19')
ON CONFLICT (coil_id) DO NOTHING;

-- Set quality hold on one coil for demo
UPDATE m5a_material.coils SET is_quality_hold = TRUE, hold_reason = 'NCR-0042: Surface defect detected' WHERE coil_id = 'coil_HR_298470';

-- ── v0.2: Stoppage Codes (16 codes, 7 buckets) ──────────────────────────────
INSERT INTO master.stoppage_codes (code, display_name, bucket, is_planned, is_external, is_active, sort_order) VALUES
  -- Equipment Failure
  ('01', 'Mechanical Breakdown',      'Equipment Failure', FALSE, FALSE, TRUE, 10),
  ('02', 'Electrical Fault',          'Equipment Failure', FALSE, FALSE, TRUE, 11),
  ('03', 'Hydraulic Failure',         'Equipment Failure', FALSE, FALSE, TRUE, 12),
  -- Tool Change
  ('04', 'Scheduled Roll Change',     'Tool Change',       TRUE,  FALSE, TRUE, 20),
  ('05', 'Unscheduled Roll Change',   'Tool Change',       FALSE, FALSE, TRUE, 21),
  ('06', 'Guide / Liner Change',      'Tool Change',       FALSE, FALSE, TRUE, 22),
  -- Material / Supply
  ('07', 'Raw Material Wait',         'Material / Supply', FALSE, TRUE,  TRUE, 30),
  ('08', 'Coil Changeover',           'Material / Supply', FALSE, FALSE, TRUE, 31),
  ('09', 'Quality Hold — Input',      'Material / Supply', FALSE, FALSE, TRUE, 32),
  -- Utility / Support
  ('10', 'Power Outage',              'Utility / Support', FALSE, TRUE,  TRUE, 40),
  ('11', 'Coolant / Lubrication',     'Utility / Support', FALSE, FALSE, TRUE, 41),
  -- Human
  ('12', 'Operator Absence',          'Human',             FALSE, FALSE, TRUE, 50),
  ('13', 'Shift Handover Delay',      'Human',             FALSE, FALSE, TRUE, 51),
  -- Planning
  ('14', 'No Work Order Available',   'Planning',          FALSE, FALSE, TRUE, 60),
  ('15', 'Schedule Change',           'Planning',          FALSE, FALSE, TRUE, 61),
  -- Planned
  ('16', 'Planned Maintenance (PM)',  'Planned',           TRUE,  FALSE, TRUE, 70)
ON CONFLICT (code) DO NOTHING;

-- ── v0.2: Defect Codes (45 codes, 6 families) ───────────────────────────────
INSERT INTO master.defect_codes (code, display_name, family, severity_default, default_disposition, is_active, sort_order) VALUES
  -- Dimensional
  ('D01', 'Gauge Over Tolerance (+)',     'Dimensional', 'major',  'rework',    TRUE, 10),
  ('D02', 'Gauge Under Tolerance (−)',    'Dimensional', 'major',  'rework',    TRUE, 11),
  ('D03', 'Width Over Tolerance',         'Dimensional', 'minor',  'rework',    TRUE, 12),
  ('D04', 'Width Under Tolerance',        'Dimensional', 'minor',  'rework',    TRUE, 13),
  ('D05', 'Camber Excess',                'Dimensional', 'minor',  'rework',    TRUE, 14),
  ('D06', 'Flatness / Waviness',          'Dimensional', 'major',  'rework',    TRUE, 15),
  ('D07', 'Coil Telescoping',             'Dimensional', 'minor',  'rework',    TRUE, 16),
  ('D08', 'Coil OD/ID Out of Spec',       'Dimensional', 'minor',  'rework',    TRUE, 17),
  -- Surface
  ('S01', 'Roll Mark / Impression',       'Surface',     'major',  'downgrade', TRUE, 20),
  ('S02', 'Scratch / Score',              'Surface',     'major',  'downgrade', TRUE, 21),
  ('S03', 'Rust / Oxidation',             'Surface',     'major',  'downgrade', TRUE, 22),
  ('S04', 'Oil Stain / Contamination',    'Surface',     'minor',  'rework',    TRUE, 23),
  ('S05', 'Pitting',                      'Surface',     'major',  'downgrade', TRUE, 24),
  ('S06', 'Lamination',                   'Surface',     'critical','scrap',    TRUE, 25),
  ('S07', 'Scale Inclusion',              'Surface',     'major',  'downgrade', TRUE, 26),
  ('S08', 'Coil Break / Crossbow',        'Surface',     'minor',  'rework',    TRUE, 27),
  -- Mechanical
  ('M01', 'Tensile Strength Low',         'Mechanical',  'critical','scrap',    TRUE, 30),
  ('M02', 'Yield Strength Low',           'Mechanical',  'critical','scrap',    TRUE, 31),
  ('M03', 'Elongation Low',               'Mechanical',  'major',  'downgrade', TRUE, 32),
  ('M04', 'Hardness Out of Range',        'Mechanical',  'major',  'downgrade', TRUE, 33),
  ('M05', 'Bend Test Failure',            'Mechanical',  'critical','scrap',    TRUE, 34),
  ('M06', 'Impact Toughness Low',         'Mechanical',  'major',  'downgrade', TRUE, 35),
  ('M07', 'Grain Size Non-Uniform',       'Mechanical',  'minor',  'rework',    TRUE, 36),
  -- Edge
  ('E01', 'Edge Crack',                   'Edge',        'critical','scrap',    TRUE, 40),
  ('E02', 'Edge Wave',                    'Edge',        'major',  'rework',    TRUE, 41),
  ('E03', 'Burr / Sharp Edge',            'Edge',        'minor',  'rework',    TRUE, 42),
  ('E04', 'Edge Trim Excess',             'Edge',        'minor',  'rework',    TRUE, 43),
  ('E05', 'Slit Edge Defect',             'Edge',        'major',  'downgrade', TRUE, 44),
  -- Process
  ('P01', 'Underpickling',                'Process',     'major',  'rework',    TRUE, 50),
  ('P02', 'Overpickling',                 'Process',     'major',  'rework',    TRUE, 51),
  ('P03', 'Annealing Defect',             'Process',     'major',  'downgrade', TRUE, 52),
  ('P04', 'Temper Rolling Defect',        'Process',     'major',  'rework',    TRUE, 53),
  ('P05', 'Coolant Residue',              'Process',     'minor',  'rework',    TRUE, 54),
  ('P06', 'Reduction Deviation',          'Process',     'major',  'rework',    TRUE, 55),
  ('P07', 'Speed Variation Mark',         'Process',     'minor',  'rework',    TRUE, 56),
  ('P08', 'Tension Variation Mark',       'Process',     'minor',  'rework',    TRUE, 57),
  ('P09', 'Weld Mark',                    'Process',     'minor',  'rework',    TRUE, 58),
  ('P10', 'Coil Set',                     'Process',     'minor',  'rework',    TRUE, 59),
  -- Handling
  ('H01', 'Dent / Ding',                  'Handling',    'major',  'downgrade', TRUE, 60),
  ('H02', 'Coil Drop Damage',             'Handling',    'critical','scrap',    TRUE, 61),
  ('H03', 'Strap Mark',                   'Handling',    'minor',  'rework',    TRUE, 62),
  ('H04', 'Moisture Damage',              'Handling',    'major',  'downgrade', TRUE, 63),
  ('H05', 'Packaging Damage',             'Handling',    'minor',  'rework',    TRUE, 64),
  ('H06', 'Mislabelled / Wrong Tag',      'Handling',    'minor',  'rework',    TRUE, 65)
ON CONFLICT (code) DO NOTHING;

-- ── v0.2: Sample Rolls for CRS-1, CRS-2, CRS-3 ──────────────────────────────
INSERT INTO master.rolls (roll_id, wc_id, roll_type, position, material_grade, diameter_mm, barrel_length_mm,
  current_wc_id, current_position, cumulative_tonnage_mt, tonnage_since_grind_mt,
  last_grind_date, grind_cycle_count, roll_finish, expected_life_mt, status) VALUES
  ('R-CRS1-TR-001', 'CRS-1', 'work', 'top',    'HSS',  300.0, 1400.0, 'CRS-1', 'top',    12450.3, 2340.1, '2026-02-15', 5, 'M', 15000.0, 'active'),
  ('R-CRS1-BR-001', 'CRS-1', 'work', 'bottom', 'HSS',  300.0, 1400.0, 'CRS-1', 'bottom', 12450.3, 2340.1, '2026-02-15', 5, 'M', 15000.0, 'active'),
  ('R-CRS2-TR-047', 'CRS-2', 'work', 'top',    'HSS',  300.0, 1400.0, 'CRS-2', 'top',    8420.3,  8420.3, '2025-11-20', 3, 'B', 15000.0, 'active'),
  ('R-CRS2-BR-023', 'CRS-2', 'work', 'bottom', 'HSS',  300.0, 1400.0, 'CRS-2', 'bottom', 8420.3,  8420.3, '2025-11-20', 3, 'B', 15000.0, 'active'),
  ('R-CRS2-TR-051', 'CRS-2', 'work', 'top',    'HSS',  300.0, 1400.0, NULL,    NULL,     0.0,     0.0,    NULL,         0, 'M', 15000.0, 'spare'),
  ('R-CRS2-BR-029', 'CRS-2', 'work', 'bottom', 'HSS',  300.0, 1400.0, NULL,    NULL,     0.0,     0.0,    NULL,         0, 'M', 15000.0, 'spare'),
  ('R-CRS3-TR-012', 'CRS-3', 'work', 'top',    'ICDP', 280.0, 1400.0, 'CRS-3', 'top',    5100.0,  1200.0, '2026-01-10', 2, 'M', 12000.0, 'active'),
  ('R-CRS3-BR-012', 'CRS-3', 'work', 'bottom', 'ICDP', 280.0, 1400.0, 'CRS-3', 'bottom', 5100.0,  1200.0, '2026-01-10', 2, 'M', 12000.0, 'active')
ON CONFLICT (roll_id) DO NOTHING;
