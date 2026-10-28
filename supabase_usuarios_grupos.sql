-- ============================================================================
-- ANTA OBRA: TABLAS DE USUARIOS Y GRUPOS (SUPABASE POSTGRESQL)
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ============================================================================

-- 1. TABLA: GRUPOS
CREATE TABLE IF NOT EXISTS public.grupos (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: USUARIOS
CREATE TABLE IF NOT EXISTS public.usuarios (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    cargo TEXT,
    empresa TEXT,
    email TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. POLÍTICAS DE ACCESO (Row-Level Security)
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Acceso total grupos" ON public.grupos;
    CREATE POLICY "Acceso total grupos" ON public.grupos FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Acceso total usuarios" ON public.usuarios;
    CREATE POLICY "Acceso total usuarios" ON public.usuarios FOR ALL USING (true) WITH CHECK (true);
END $$;

-- 4. INSERTAR GRUPOS INICIALES (si no existen)
INSERT INTO public.grupos (id, name, description, permissions)
VALUES 
    ('admin', 'Administradores', 'Acceso total y configuración del sistema, usuarios y permisos', '["actas:view", "actas:create", "actas:edit", "actas:delete", "actas:export", "informes:view", "informes:create", "informes:edit", "informes:delete", "informes:export", "notas:view", "notas:create", "notas:edit", "notas:delete", "users:manage", "groups:manage", "settings:manage"]'::jsonb),
    ('direccion_obra', 'Dirección Facultativa (DO)', 'Arquitectos directores de obra. Creación, edición y firma de actas e informes', '["actas:view", "actas:create", "actas:edit", "actas:delete", "actas:export", "informes:view", "informes:create", "informes:edit", "informes:delete", "informes:export", "notas:view", "notas:create", "notas:edit", "notas:delete", "settings:manage"]'::jsonb),
    ('direccion_ejecucion', 'Dirección de Execución Material (DEM)', 'Aparejadores / Arquitectos técnicos. Control de calidad, mediciones y actas', '["actas:view", "actas:create", "actas:edit", "actas:export", "informes:view", "informes:create", "informes:edit", "informes:export", "notas:view", "notas:create", "notas:edit"]'::jsonb),
    ('seguridad_salud', 'Coordinación Seguridade e Saúde (CSS)', 'Control y supervisión de seguridad, salud laboral y medidas preventivas', '["actas:view", "actas:edit", "actas:export", "informes:view", "informes:edit", "informes:export", "notas:view", "notas:create"]'::jsonb),
    ('constructora', 'Empresa Constructora (JO)', 'Jefatura de obra y contrata. Consulta y aportación de partes', '["actas:view", "actas:export", "informes:view", "informes:export", "notas:view", "notas:create"]'::jsonb),
    ('solo_lectura', 'Propiedad / Consulta (Só Lectura)', 'Promotores, inspección municipal y visualizadores sin permiso de modificación', '["actas:view", "actas:export", "informes:view", "informes:export", "notas:view"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 5. INSERTAR USUARIOS (ADMIN Y PRUEBA_DO)
INSERT INTO public.usuarios (id, username, password, name, role, cargo, empresa, email, active)
VALUES 
    ('usr-admin', 'Admin', '0000', 'Administrador General', 'admin', 'Administrador de Plataforma', 'Dirección de Obra', 'admin@antaobra.gal', true),
    ('usr-prueba-do', 'prueba_DO', '1234', 'Director de Obra', 'direccion_obra', 'Director de Obra', 'UTE 1', 'nombre@coag.es', true)
ON CONFLICT (username) DO NOTHING;
