-- ============================================================================
-- ANTA OBRA: ESQUEMA DE BASE DE DATOS INICIAL (POSTGRESQL / SUPABASE)
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ============================================================================

-- 1. TABLA: AGENTES
CREATE TABLE IF NOT EXISTS public.agentes (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    cargo_habitual TEXT,
    entidad TEXT,
    colegiado TEXT,
    telefono TEXT,
    email TEXT,
    color_fondo TEXT DEFAULT '#1e3a8a',
    iniciales TEXT,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: OBRAS
CREATE TABLE IF NOT EXISTS public.obras (
    id TEXT PRIMARY KEY,
    expediente TEXT NOT NULL,
    titulo TEXT NOT NULL,
    situacion TEXT,
    promotor TEXT,
    contratista TEXT,
    jefe_obra TEXT,
    direccion_obra TEXT,
    direccion_ejecucion TEXT,
    coordinador_css TEXT,
    agentes JSONB DEFAULT '[]'::jsonb,
    presupuesto NUMERIC(15, 2),
    plazo_meses NUMERIC(5, 1),
    fecha_inicio DATE,
    estado TEXT DEFAULT 'en_curso',
    datos JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA: ACTAS
CREATE TABLE IF NOT EXISTS public.actas (
    id TEXT PRIMARY KEY,
    obra_id TEXT REFERENCES public.obras(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL,
    fecha DATE NOT NULL,
    hora TEXT,
    estado TEXT DEFAULT 'borrador',
    asistentes JSONB DEFAULT '[]'::jsonb,
    cuestiones JSONB DEFAULT '[]'::jsonb,
    indicaciones_seguridad JSONB DEFAULT '[]'::jsonb,
    actuaciones_previstas JSONB DEFAULT '[]'::jsonb,
    firmas JSONB DEFAULT '[]'::jsonb,
    fotos JSONB DEFAULT '[]'::jsonb,
    anexos_pdf JSONB DEFAULT '[]'::jsonb,
    datos JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA: INFORMES
CREATE TABLE IF NOT EXISTS public.informes (
    id TEXT PRIMARY KEY,
    obra_id TEXT REFERENCES public.obras(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL,
    tipo TEXT DEFAULT 'mensual',
    datos_xerais JSONB DEFAULT '{}'::jsonb,
    resumo_executivo JSONB DEFAULT '{}'::jsonb,
    traballos_executados JSONB DEFAULT '{}'::jsonb,
    condicionantes_modificacions JSONB DEFAULT '{}'::jsonb,
    control_economico JSONB DEFAULT '{}'::jsonb,
    control_prazo JSONB DEFAULT '{}'::jsonb,
    control_calidade JSONB DEFAULT '{}'::jsonb,
    seguridade_saude JSONB DEFAULT '{}'::jsonb,
    reportaxe_fotografica JSONB DEFAULT '[]'::jsonb,
    outros JSONB DEFAULT '{}'::jsonb,
    conclusion JSONB DEFAULT '{}'::jsonb,
    actas_pdf JSONB DEFAULT '[]'::jsonb,
    anexos_pdf JSONB DEFAULT '[]'::jsonb,
    actas_anexas_ids JSONB DEFAULT '[]'::jsonb,
    datos JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA: NOTAS DE OBRA
CREATE TABLE IF NOT EXISTS public.notas (
    id TEXT PRIMARY KEY,
    obra_id TEXT REFERENCES public.obras(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL,
    fecha DATE DEFAULT CURRENT_DATE,
    asunto TEXT NOT NULL,
    contenido TEXT,
    autor TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA: GRUPOS
CREATE TABLE IF NOT EXISTS public.grupos (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLA: USUARIOS
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

-- 8. POLÍTICAS DE ACCESO INICIALES (Row-Level Security)
ALTER TABLE public.agentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.informes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Acceso total agentes" ON public.agentes;
    CREATE POLICY "Acceso total agentes" ON public.agentes FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Acceso total obras" ON public.obras;
    CREATE POLICY "Acceso total obras" ON public.obras FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Acceso total actas" ON public.actas;
    CREATE POLICY "Acceso total actas" ON public.actas FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Acceso total informes" ON public.informes;
    CREATE POLICY "Acceso total informes" ON public.informes FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Acceso total notas" ON public.notas;
    CREATE POLICY "Acceso total notas" ON public.notas FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Acceso total grupos" ON public.grupos;
    CREATE POLICY "Acceso total grupos" ON public.grupos FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Acceso total usuarios" ON public.usuarios;
    CREATE POLICY "Acceso total usuarios" ON public.usuarios FOR ALL USING (true) WITH CHECK (true);
END $$;

-- 9. BUCKET DE ALMACENAMIENTO PARA FOTOS Y PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('anta-files', 'anta-files', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Storage Access" ON storage.objects;
    CREATE POLICY "Public Storage Access" ON storage.objects
    FOR ALL USING (bucket_id = 'anta-files') WITH CHECK (bucket_id = 'anta-files');
END $$;

