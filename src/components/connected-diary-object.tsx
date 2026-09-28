import {
  BookOpen,
  CalendarDays,
  Camera,
  Gift,
  Image as ImageIcon,
  Mail,
  MapPin,
  MessageCircle,
  Music2,
  Shirt,
} from "lucide-react";

import {
  connectedKindLabel,
  connectedMoment,
  type ConnectedDiaryView,
} from "@/lib/connected-diary";

import "./connected-diary.css";

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function iconFor(kind: ConnectedDiaryView["item"]["kind"]) {
  switch (kind) {
    case "photo":
    case "video":
      return Camera;
    case "letter":
      return Mail;
    case "song":
      return Music2;
    case "date":
    case "plan":
      return CalendarDays;
    case "place":
      return MapPin;
    case "keepsake":
      return Gift;
    case "clothing":
    case "look":
      return Shirt;
    case "diary":
      return BookOpen;
    case "chat_media":
      return MessageCircle;
    default:
      return ImageIcon;
  }
}

function dateLabel(value: string | null | undefined) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function ConnectedDiaryObject({
  view,
  compact = false,
  onOpen,
}: {
  view: ConnectedDiaryView;
  compact?: boolean;
  onOpen?: () => void;
}) {
  const { item, mediaUrl } = view;
  const Icon = iconFor(item.kind);
  const data = safeObject(item.data);
  const moment = dateLabel(connectedMoment(item));

  const artist =
    typeof data.artist === "string" ? data.artist : null;

  const album =
    typeof data.album === "string" ? data.album : null;

  const place =
    typeof data.place === "string" ? data.place : null;

  const category =
    typeof data.category === "string" ? data.category : null;

  const mediaType =
    typeof data.media_type === "string" ? data.media_type : null;

  const transcript =
    typeof data.transcript === "string" ? data.transcript : null;

  const sourceContext =
    typeof data.source_context === "string"
      ? data.source_context
      : null;

  const chatSender =
    typeof data.chat_sender === "string"
      ? data.chat_sender
      : null;

  const contextLocation =
    typeof data.context_location === "string"
      ? data.context_location
      : null;

  const contextActivity =
    typeof data.context_activity === "string"
      ? data.context_activity
      : null;

  const sealedLetter =
    item.kind === "letter" &&
    data.opened === false &&
    item.owner === "dominic";

  const isImageMedia =
    Boolean(mediaUrl) &&
    (item.kind === "photo" ||
      item.kind === "video" ||
      (item.kind === "chat_media" && mediaType === "photo"));

  return (
    <article
      className={[
        "connected-diary-object",
        onOpen ? "connected-object-clickable" : "",
        `connected-kind-${item.kind}`,
        compact ? "connected-object-compact" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={
        onOpen
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen();
              }
            }
          : undefined
      }
    >
      {isImageMedia && mediaUrl && (
        <div className="connected-object-photo">
          <img
            src={mediaUrl}
            alt={item.title ?? connectedKindLabel(item.kind)}
            loading="lazy"
          />
        </div>
      )}

      {item.kind === "song" && mediaUrl && (
        <div className="connected-object-cover">
          <img
            src={mediaUrl}
            alt=""
            loading="lazy"
          />
        </div>
      )}

      <div className="connected-object-copy">
        <header>
          <span className="connected-object-kind">
            <Icon size={13} strokeWidth={1.4} />
            {connectedKindLabel(item.kind)}
          </span>

          {moment && <time>{moment}</time>}
        </header>

        <strong>
          {item.title ??
            (item.kind === "diary"
              ? "Diary entry"
              : connectedKindLabel(item.kind))}
        </strong>

        {item.kind === "song" && (artist || album) && (
          <small>
            {[artist, album].filter(Boolean).join(" · ")}
          </small>
        )}

        {(item.kind === "date" || item.kind === "plan") && place && (
          <small>{place}</small>
        )}

        {(item.kind === "clothing" || item.kind === "look") &&
          category && <small>{category}</small>}

        {item.kind === "photo" && sourceContext === "chat" && (
          <small>
            From Chat
            {chatSender === "dominic" ? " with Dominic" : ""}
          </small>
        )}

        {item.kind === "photo" && contextLocation && (
          <small>
            At: {contextLocation.replaceAll("_", " ")}
          </small>
        )}

        {item.kind === "photo" && contextActivity && (
          <small>
            Moment: {contextActivity.replaceAll("_", " ")}
          </small>
        )}

        {sealedLetter ? (
          <p className="connected-object-sealed">
            Sealed — open it from Letters first.
          </p>
        ) : (
          !compact &&
          item.body && (
            <p className="connected-object-body">
              {item.body}
            </p>
          )
        )}

        {!compact &&
          item.kind === "chat_media" &&
          transcript &&
          transcript !== item.body && (
            <p className="connected-object-transcript">
              “{transcript}”
            </p>
          )}
      </div>
    </article>
  );
}
