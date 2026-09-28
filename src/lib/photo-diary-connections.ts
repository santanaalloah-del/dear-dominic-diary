import {
  linkPhotoToItem,
  type PhotoGenerationRequest,
} from "@/lib/photo-engine";
import {
  getWardrobePhotoContexts,
  type WardrobeOwner,
} from "@/lib/wardrobe-context";

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function safeString(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function wardrobeOwnersForRequest(
  request: PhotoGenerationRequest
): WardrobeOwner[] {
  if (!request.use_current_look) return [];

  if (request.subject_type === "me") {
    return ["alloah"];
  }

  if (request.subject_type === "dominic") {
    return ["dominic"];
  }

  return ["alloah", "dominic"];
}

async function safeLink({
  userId,
  photoId,
  targetItemId,
  relation,
  data,
}: {
  userId: string;
  photoId: string;
  targetItemId: string | null;
  relation: string;
  data: Record<string, unknown>;
}) {
  if (!targetItemId) return;

  await linkPhotoToItem({
    userId,
    photoId,
    targetItemId,
    relation,
    data,
  }).catch((error) => {
    console.error(
      `Could not create diary photo link (${relation}):`,
      error
    );
  });
}

export async function linkGeneratedPhotoContext({
  userId,
  photoId,
  request,
}: {
  userId: string;
  photoId: string;
  request: PhotoGenerationRequest;
}) {
  const context = safeObject(request.context_snapshot);
  const custom = safeObject(context.custom);

  const memoryId = safeString(context.memoryId);
  const dateId = safeString(custom.dateId);
  const placeId = safeString(custom.placeId);

  await Promise.all([
    safeLink({
      userId,
      photoId,
      targetItemId: memoryId,
      relation: "contains",
      data: {
        source: "photo_engine",
        connection_type: "memory",
      },
    }),
    safeLink({
      userId,
      photoId,
      targetItemId: dateId,
      relation: "has_photo",
      data: {
        source: "photo_engine",
        connection_type: "date",
      },
    }),
    safeLink({
      userId,
      photoId,
      targetItemId: placeId,
      relation: "taken_at",
      data: {
        source: "photo_engine",
        connection_type: "place",
      },
    }),
  ]);

  const owners = wardrobeOwnersForRequest(request);

  if (owners.length === 0) return;

  const wardrobeContexts =
    await getWardrobePhotoContexts({
      userId,
      owners,
    }).catch((error) => {
      console.error(
        "Could not read Wardrobe for photo connections:",
        error
      );
      return [];
    });

  for (const wardrobe of wardrobeContexts) {
    if (wardrobe.lookId) {
      await safeLink({
        userId,
        photoId,
        targetItemId: wardrobe.lookId,
        relation: "worn_in",
        data: {
          source: "photo_engine",
          connection_type: "wardrobe",
          owner: wardrobe.owner,
        },
      });

      continue;
    }

    await Promise.all(
      wardrobe.clothing.map((piece) =>
        safeLink({
          userId,
          photoId,
          targetItemId: piece.id,
          relation: "worn_in",
          data: {
            source: "photo_engine",
            connection_type: "wardrobe",
            owner: wardrobe.owner,
          },
        })
      )
    );
  }
}

export function generatedPhotoContextData(
  request: PhotoGenerationRequest
) {
  const context = safeObject(request.context_snapshot);

  return {
    conversation_summary:
      safeString(context.conversationSummary),
    context_location:
      safeString(context.location),
    context_activity:
      safeString(context.activity),
    context_time_of_day:
      safeString(context.timeOfDay),
    calendar_date:
      safeString(context.calendarDate),
    connected_context: true,
  };
}
