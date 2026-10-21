import { useRef, useState, type PointerEvent } from "react";
import type { GalleryPhoto } from "@/lib/diario-world";
import "./diary-page-composer.css";

export type DiaryDecoration = {
  id: string;
  type: "ornament" | "photo" | "ticket";
  motif?: string;
  photoId?: string;
  x: number;
  y: number;
  angle: number;
};
export type DiaryComposition = {
  version: 1;
  paper: "cream" | "rose" | "wine";
  font: "editorial" | "handwritten" | "typewriter";
  size: "small" | "regular" | "large";
  align: "left" | "center";
  decorations: DiaryDecoration[];
};
const motifs = ["❦", "✧", "♡", "✉", "✿"];
export const emptyDiaryComposition = (): DiaryComposition => ({
  version: 1, paper: "cream", font: "editorial", size: "regular",
  align: "left", decorations: [],
});
export function readDiaryComposition(value: unknown): DiaryComposition {
  const v = value && typeof value === "object" ? value as Partial<DiaryComposition> : {};
  return {
    version: 1,
    paper: ["cream", "rose", "wine"].includes(String(v.paper)) ? v.paper! : "cream",
    font: ["editorial", "handwritten", "typewriter"].includes(String(v.font)) ? v.font! : "editorial",
    size: ["small", "regular", "large"].includes(String(v.size)) ? v.size! : "regular",
    align: ["left", "center"].includes(String(v.align)) ? v.align! : "left",
    decorations: Array.isArray(v.decorations) ? v.decorations.filter(d =>
      d && ["ornament", "photo", "ticket"].includes(d.type) &&
      typeof d.id === "string" && Number.isFinite(d.x) && Number.isFinite(d.y)
    ).slice(0, 18).map(d => ({ ...d,
      x: Math.max(2, Math.min(85, d.x)),
      y: Math.max(1, Math.min(88, d.y)),
      angle: Number.isFinite(d.angle) ? d.angle : 0,
    })) : [],
  };
}

type Props = {
  body: string;
  composition: DiaryComposition;
  photos?: GalleryPhoto[];
  editing?: boolean;
  onBodyChange?: (body: string) => void;
  onCompositionChange?: (composition: DiaryComposition) => void;
};
export function DiaryPageComposer({
  body, composition, photos = [], editing = false,
  onBodyChange, onCompositionChange,
}: Props) {
  const page = useRef<HTMLDivElement>(null);
  const dragging = useRef<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [photoId, setPhotoId] = useState("");
  const update = (next: Partial<DiaryComposition>) =>
    onCompositionChange?.({ ...composition, ...next });
  const add = (decoration: Omit<DiaryDecoration, "id" | "x" | "y" | "angle">) => {
    if (!editing || composition.decorations.length >= 18) return;
    const id = crypto.randomUUID();
    update({ decorations: [...composition.decorations, {
      id, x: 60, y: 45, angle: -6, ...decoration,
    }] });
    setSelected(id);
  };
  const reposition = (id: string, x: number, y: number) =>
    update({ decorations: composition.decorations.map(d => d.id === id
      ? { ...d, x: Math.max(2, Math.min(85, x)), y: Math.max(1, Math.min(88, y)) } : d) });
  const drag = (event: PointerEvent<HTMLButtonElement>, id: string) => {
    if (!editing) return;
    event.preventDefault();
    dragging.current = id;
    setSelected(id);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent<HTMLButtonElement>, id: string) => {
    if (dragging.current !== id || !page.current) return;
    const bounds = page.current.getBoundingClientRect();
    reposition(id, (event.clientX - bounds.left) * 100 / bounds.width,
      (event.clientY - bounds.top) * 100 / bounds.height);
  };
  const selectedDecoration = composition.decorations.find(d => d.id === selected);
  return (
    <div className="journal-composer">
      {editing && <div className="journal-toolbar" aria-label="Page appearance">
        <label>Paper
          <select value={composition.paper} onChange={e => update({ paper: e.target.value as DiaryComposition["paper"] })}>
            <option value="cream">Old letter</option><option value="rose">Rose paper</option><option value="wine">Cherry wine</option>
          </select>
        </label>
        <label>Writing
          <select value={composition.font} onChange={e => update({ font: e.target.value as DiaryComposition["font"] })}>
            <option value="editorial">Editorial</option><option value="handwritten">Handwritten</option><option value="typewriter">Typewriter</option>
          </select>
        </label>
        <label>Size
          <select value={composition.size} onChange={e => update({ size: e.target.value as DiaryComposition["size"] })}>
            <option value="small">Small</option><option value="regular">Regular</option><option value="large">Large</option>
          </select>
        </label>
        <label>Align
          <select value={composition.align} onChange={e => update({ align: e.target.value as DiaryComposition["align"] })}>
            <option value="left">Left</option><option value="center">Center</option>
          </select>
        </label>
      </div>}
      <div ref={page} className={["journal-paper",
        "journal-paper--" + composition.paper,
        "journal-font--" + composition.font,
        "journal-size--" + composition.size,
        "journal-align--" + composition.align].join(" ")}>
        <div className="journal-rule" aria-hidden="true"/>
        {editing
          ? <textarea className="journal-writing" aria-label="Diary page text"
              rows={12} value={body} placeholder="Write what happened today…"
              onChange={e => onBodyChange?.(e.target.value)} />
          : <p className="journal-writing journal-reading">{body || "Nothing written here yet."}</p>}
        {composition.decorations.map(d => {
          const photo = d.type === "photo" ? photos.find(p => p.item.id === d.photoId) : null;
          return <button key={d.id} type="button"
            className={["journal-object", "journal-object--" + d.type,
              editing && selected === d.id ? "is-selected" : ""].join(" ")}
            style={{ left: d.x + "%", top: d.y + "%", transform: "rotate(" + d.angle + "deg)" }}
            disabled={!editing}
            aria-label={d.type === "photo" ? "Move saved photograph" : "Move scrapbook decoration"}
            onPointerDown={e => drag(e, d.id)}
            onPointerMove={e => move(e, d.id)}
            onPointerUp={() => { dragging.current = null; }}
            onPointerCancel={() => { dragging.current = null; }}>
            {photo ? <img src={photo.url} alt={photo.item.title || "Photograph from Gallery"} draggable={false}/> :
              d.type === "photo" ? <span className="journal-missing-photo">Gallery photo</span> :
              d.type === "ticket" ? <span className="journal-ticket">KEPT · LITTLE MOMENT</span> :
              <span aria-hidden="true">{motifs.includes(d.motif || "") ? d.motif : "❦"}</span>}
          </button>;
        })}
      </div>
      {editing && <>
        <div className="journal-elements" aria-label="Add scrapbook objects">
          <span className="journal-elements-title">Add to this page</span>
          {motifs.map(m => <button type="button" key={m} onClick={() => add({ type: "ornament", motif: m })}
            aria-label={"Add ornament " + m}>{m}</button>)}
          <button type="button" onClick={() => add({ type: "ticket" })}>Ticket</button>
        </div>
        <div className="journal-gallery-picker">
          <label>From your Gallery
            <select value={photoId} onChange={e => setPhotoId(e.target.value)}>
              <option value="">Choose an existing photograph</option>
              {photos.map(photo => <option key={photo.item.id} value={photo.item.id}>
                {photo.item.title || "Photo"} · {new Date(photo.item.created_at).toLocaleDateString("en-US")}
              </option>)}
            </select>
          </label>
          <button type="button" disabled={!photoId} onClick={() => { add({ type: "photo", photoId }); setPhotoId(""); }}>
            Place photo
          </button>
        </div>
        {selectedDecoration && <div className="journal-object-controls">
          <span>Selected object · drag it on the page, or use these controls</span>
          <button type="button" onClick={() => reposition(selectedDecoration.id, selectedDecoration.x - 5, selectedDecoration.y)}>←</button>
          <button type="button" onClick={() => reposition(selectedDecoration.id, selectedDecoration.x + 5, selectedDecoration.y)}>→</button>
          <button type="button" onClick={() => reposition(selectedDecoration.id, selectedDecoration.x, selectedDecoration.y - 5)}>↑</button>
          <button type="button" onClick={() => reposition(selectedDecoration.id, selectedDecoration.x, selectedDecoration.y + 5)}>↓</button>
          <button type="button" onClick={() => update({ decorations: composition.decorations.map(d => d.id === selected
            ? { ...d, angle: (d.angle + 15) % 360 } : d) })}>Rotate</button>
          <button type="button" onClick={() => {update({ decorations: composition.decorations.filter(d => d.id !== selected) });setSelected(null);}}>Remove</button>
        </div>}
      </>}
    </div>
  );
}
