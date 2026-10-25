-- Habitat cottage renovation settings (colours, styles, size). Additive: older Workers ignore it.
ALTER TABLE habitat_worlds ADD COLUMN house TEXT NOT NULL DEFAULT '{}';
