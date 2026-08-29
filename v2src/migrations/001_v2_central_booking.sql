-- V2: central booking integrity
-- Run once against the production PostgreSQL database.

CREATE INDEX IF NOT EXISTS idx_slots_data_horario ON slots (data, horario);
CREATE INDEX IF NOT EXISTS idx_slots_active ON slots (ativo);
CREATE INDEX IF NOT EXISTS idx_appointments_slot_status ON appointments (slot_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments (data);
CREATE INDEX IF NOT EXISTS idx_appointments_posto ON appointments (posto_id);

-- Prevent duplicate appointment IDs under retries.
CREATE UNIQUE INDEX IF NOT EXISTS ux_appointments_appointment_id
  ON appointments (appointment_id);

-- Make sure occupied counters cannot become negative.
ALTER TABLE slots DROP CONSTRAINT IF EXISTS slots_vagas_ocupadas_nonnegative;
ALTER TABLE slots ADD CONSTRAINT slots_vagas_ocupadas_nonnegative CHECK (vagas_ocupadas >= 0);

-- Capacity must always be positive.
ALTER TABLE slots DROP CONSTRAINT IF EXISTS slots_vagas_totais_positive;
ALTER TABLE slots ADD CONSTRAINT slots_vagas_totais_positive CHECK (vagas_totais >= 1);
