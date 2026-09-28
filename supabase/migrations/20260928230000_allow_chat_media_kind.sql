ALTER TABLE public.diario_items
DROP CONSTRAINT IF EXISTS diario_items_kind_check;

ALTER TABLE public.diario_items
ADD CONSTRAINT diario_items_kind_check
CHECK (
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
    'chat_media',
    'home_object',
    'home_change'
  )
);
