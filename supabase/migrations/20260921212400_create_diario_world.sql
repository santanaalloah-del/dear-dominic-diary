-- Diário world data
-- Separate from public.memories, which belongs to Dominic's AI memory system.

CREATE TABLE public.diario_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid NOT NULL
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  kind text NOT NULL CHECK (
    kind IN (
      'diary',
      'letter',
      'photo',
      'video',
      'album',
      'date',
      'place',
      'keepsake',
      'clothing',
      'look',
      'song',
      'story_memory',
      'note',
      'plan',
      'home_object',
      'home_change'
    )
  ),

  owner text NOT NULL DEFAULT 'shared' CHECK (
    owner IN (
      'alloah',
      'dominic',
      'shared'
    )
  ),

  status text NOT NULL DEFAULT 'active',

  title text,
  body text,

  event_at timestamptz,
  planned_for timestamptz,

  data jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT diario_items_id_user_unique
    UNIQUE (id, user_id)
);

CREATE TABLE public.diario_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid NOT NULL
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  source_item_id uuid NOT NULL,
  target_item_id uuid NOT NULL,

  relation text NOT NULL,

  data jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT diario_links_source_user_fkey
    FOREIGN KEY (source_item_id, user_id)
    REFERENCES public.diario_items(id, user_id)
    ON DELETE CASCADE,

  CONSTRAINT diario_links_target_user_fkey
    FOREIGN KEY (target_item_id, user_id)
    REFERENCES public.diario_items(id, user_id)
    ON DELETE CASCADE,

  CONSTRAINT diario_links_no_self_link
    CHECK (source_item_id <> target_item_id),

  CONSTRAINT diario_links_unique_relation
    UNIQUE (
      user_id,
      source_item_id,
      target_item_id,
      relation
    )
);

CREATE TABLE public.diario_settings (
  user_id uuid PRIMARY KEY
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  appearance text NOT NULL DEFAULT 'system' CHECK (
    appearance IN (
      'system',
      'light',
      'dark'
    )
  ),

  time_aware boolean NOT NULL DEFAULT true,
  privacy_cover boolean NOT NULL DEFAULT true,
  music_enabled boolean NOT NULL DEFAULT false,
  voice_enabled boolean NOT NULL DEFAULT false,

  data jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX diario_items_user_kind_idx
  ON public.diario_items (
    user_id,
    kind
  );

CREATE INDEX diario_items_user_event_idx
  ON public.diario_items (
    user_id,
    event_at DESC
  );

CREATE INDEX diario_items_user_planned_idx
  ON public.diario_items (
    user_id,
    planned_for
  );

CREATE INDEX diario_links_source_idx
  ON public.diario_links (
    user_id,
    source_item_id
  );

CREATE INDEX diario_links_target_idx
  ON public.diario_links (
    user_id,
    target_item_id
  );

CREATE OR REPLACE FUNCTION public.set_diario_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_diario_items_updated_at
BEFORE UPDATE ON public.diario_items
FOR EACH ROW
EXECUTE FUNCTION public.set_diario_updated_at();

CREATE TRIGGER set_diario_settings_updated_at
BEFORE UPDATE ON public.diario_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_diario_updated_at();

ALTER TABLE public.diario_items
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.diario_links
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.diario_settings
ENABLE ROW LEVEL SECURITY;

CREATE POLICY "diario_items_select_own"
ON public.diario_items
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);

CREATE POLICY "diario_items_insert_own"
ON public.diario_items
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "diario_items_update_own"
ON public.diario_items
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "diario_items_delete_own"
ON public.diario_items
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
);

CREATE POLICY "diario_links_select_own"
ON public.diario_links
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);

CREATE POLICY "diario_links_insert_own"
ON public.diario_links
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "diario_links_update_own"
ON public.diario_links
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "diario_links_delete_own"
ON public.diario_links
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
);

CREATE POLICY "diario_settings_select_own"
ON public.diario_settings
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);

CREATE POLICY "diario_settings_insert_own"
ON public.diario_settings
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "diario_settings_update_own"
ON public.diario_settings
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "diario_settings_delete_own"
ON public.diario_settings
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
);

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.diario_items
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.diario_links
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.diario_settings
TO authenticated;

GRANT ALL
ON public.diario_items
TO service_role;

GRANT ALL
ON public.diario_links
TO service_role;

GRANT ALL
ON public.diario_settings
TO service_role;
