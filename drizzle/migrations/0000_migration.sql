CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subjects" ON public.subjects FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.weekday_settings (
  user_id uuid NOT NULL DEFAULT auth.uid(),
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  is_rest boolean NOT NULL DEFAULT false,
  subject_ids uuid[] NOT NULL DEFAULT '{}',
  PRIMARY KEY (user_id, weekday)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekday_settings TO authenticated;
GRANT ALL ON public.weekday_settings TO service_role;
ALTER TABLE public.weekday_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own weekday" ON public.weekday_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.textbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  unit_type text NOT NULL CHECK (unit_type IN ('page','problem','day')),
  start_unit integer NOT NULL DEFAULT 1,
  end_unit integer NOT NULL,
  initial_completed integer NOT NULL DEFAULT 0,
  start_date date NOT NULL,
  end_date date NOT NULL,
  units_per_day integer NOT NULL DEFAULT 1,
  max_per_day integer,
  day_ranges jsonb NOT NULL DEFAULT '{}'::jsonb,
  memo text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.textbooks TO authenticated;
GRANT ALL ON public.textbooks TO service_role;
ALTER TABLE public.textbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own textbooks" ON public.textbooks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  textbook_id uuid NOT NULL REFERENCES public.textbooks(id) ON DELETE CASCADE,
  date date NOT NULL,
  unit_start integer NOT NULL,
  unit_end integer NOT NULL,
  completed_amount integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX plan_items_user_date ON public.plan_items(user_id, date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_items TO authenticated;
GRANT ALL ON public.plan_items TO service_role;
ALTER TABLE public.plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plan items" ON public.plan_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);