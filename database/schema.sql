-- =============================================================================
-- CivicPulse Nexus — Master Schema
-- Milestone 1 (Citizen & Grievance) + Milestone 2 (Certificate & Permit)
-- =============================================================================

-- ── Citizens ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS citizens (
    id           BIGSERIAL PRIMARY KEY,
    citizen_code VARCHAR(30)  UNIQUE NOT NULL,  -- e.g. CTZ-2026-000001
    full_name    VARCHAR(120) NOT NULL,
    dob          DATE,
    gender       VARCHAR(10),
    phone        VARCHAR(15)  NOT NULL,
    email        VARCHAR(150) UNIQUE,
    aadhar_masked VARCHAR(20),                  -- stored as XXXX-XXXX-1234
    ward         INTEGER,
    address      TEXT,
    status       VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── Officers ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS officers (
    id             BIGSERIAL PRIMARY KEY,
    officer_code   VARCHAR(30)  UNIQUE NOT NULL,  -- e.g. OFC-2026-000001
    full_name      VARCHAR(120) NOT NULL,
    email          VARCHAR(150) UNIQUE NOT NULL,
    phone          VARCHAR(15)  NOT NULL,
    department     VARCHAR(120) NOT NULL,
    keycloak_role  VARCHAR(30)  NOT NULL DEFAULT 'OFFICER',
    head_officer   BOOLEAN      NOT NULL DEFAULT FALSE,
    status         VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── Grievances ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS grievances (
    id               BIGSERIAL PRIMARY KEY,
    citizen_id       BIGINT       NOT NULL REFERENCES citizens(id),
    department       VARCHAR(120),
    title            VARCHAR(255) NOT NULL,
    description      TEXT,
    priority         VARCHAR(10)  NOT NULL DEFAULT 'MEDIUM',  -- LOW | MEDIUM | HIGH
    status           VARCHAR(30)  NOT NULL DEFAULT 'OPEN',
    assigned_officer VARCHAR(120),
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    due_date         TIMESTAMP,
    resolved_date    TIMESTAMP
);

-- ── Certificates & Permits ────────────────────────────────────────────────────
--
-- A single table covers both certificates (BIRTH, DEATH, INCOME, RESIDENCE,
-- MARRIAGE) and permits/licences (TRADE_LICENSE, SHOP_LICENSE, BUILDING_PERMIT,
-- WATER_CONNECTION).  The certificate_type column distinguishes them.
--
-- Status workflow:
--   SUBMITTED → UNDER_VERIFICATION → VERIFIED → APPROVED → CERTIFICATE_GENERATED → DOWNLOADED
--                                                         ↘ REJECTED (at any pre-generated stage)

CREATE TABLE IF NOT EXISTS certificates (
    id                  BIGSERIAL PRIMARY KEY,
    application_number  VARCHAR(30) UNIQUE,             -- e.g. APP-2026-000001
    citizen_id          BIGINT      NOT NULL,
    citizen_name        VARCHAR(120) NOT NULL,
    citizen_address     TEXT,
    aadhaar_number      VARCHAR(12),
    certificate_type    VARCHAR(30)  NOT NULL,           -- see CertificateType enum
    status              VARCHAR(30)  NOT NULL DEFAULT 'SUBMITTED',
    applied_by          VARCHAR(150),                   -- JWT preferred_username of applicant
    verified_by         VARCHAR(150),
    decided_by          VARCHAR(150),
    rejection_reason    TEXT,
    remarks             TEXT,
    certificate_number  VARCHAR(30) UNIQUE,             -- e.g. BC-2026-0001 / TL-2026-0001
    download_count      INTEGER     NOT NULL DEFAULT 0,
    applied_at          TIMESTAMP   NOT NULL DEFAULT NOW(),
    verified_at         TIMESTAMP,
    decided_at          TIMESTAMP,
    issued_at           TIMESTAMP
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_grievances_citizen_id   ON grievances(citizen_id);
CREATE INDEX IF NOT EXISTS idx_grievances_status       ON grievances(status);
CREATE INDEX IF NOT EXISTS idx_grievances_department   ON grievances(department);

CREATE INDEX IF NOT EXISTS idx_certificates_citizen_id ON certificates(citizen_id);
CREATE INDEX IF NOT EXISTS idx_certificates_status     ON certificates(status);
CREATE INDEX IF NOT EXISTS idx_certificates_type       ON certificates(certificate_type);

CREATE INDEX IF NOT EXISTS idx_officers_department     ON officers(department);
CREATE INDEX IF NOT EXISTS idx_officers_email          ON officers(email);
