import * as React from "react";
import { vcardFileName, whatsappLink, type VCardData } from "@qira/shared";
import {
  Building2,
  Download,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
  UserCheck,
} from "lucide-react";

export function VCardView({ slug, vcard }: { slug: string; vcard: VCardData }) {
  const fullName = [vcard.firstName, vcard.lastName].filter(Boolean).join(" ").trim();
  const initials = [vcard.firstName?.[0], vcard.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "VC";
  const downloadFile = vcardFileName(vcard);
  const mapsUrl = vcard.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(vcard.address)}`
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-900/90 shadow-2xl backdrop-blur">
        <div className="h-28 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600" />

        <div className="px-6 pb-8">
          <div className="-mt-14 mb-4 flex items-end justify-between">
            {vcard.photoUrl ? (
              <img
                src={vcard.photoUrl}
                alt={fullName}
                className="size-24 rounded-2xl border-4 border-slate-900 bg-slate-800 object-cover shadow-lg"
              />
            ) : (
              <div className="flex size-24 items-center justify-center rounded-2xl border-4 border-slate-900 bg-indigo-600 text-2xl font-bold text-white shadow-lg">
                {initials}
              </div>
            )}

            <a
              href={`/p/${encodeURIComponent(slug)}/vcard`}
              download={downloadFile}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-400"
            >
              <Download className="size-4" />
              Guardar Contacto (.vcf)
            </a>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{fullName}</h1>
            {vcard.title ? <p className="mt-0.5 text-sm font-medium text-indigo-300">{vcard.title}</p> : null}
            {vcard.company ? (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-400">
                <Building2 className="size-3.5 shrink-0" />
                {vcard.company}
              </p>
            ) : null}
          </div>

          {vcard.note ? (
            <p className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3.5 text-sm leading-relaxed text-slate-300">
              {vcard.note}
            </p>
          ) : null}

          {/* Quick action pills */}
          <div className="mt-6 flex flex-wrap gap-2">
            {vcard.phone ? (
              <a
                href={`tel:${vcard.phone}`}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs font-medium text-white transition hover:bg-white/10"
              >
                <Phone className="size-4 text-indigo-400" />
                Llamar
              </a>
            ) : null}
            {vcard.whatsapp ? (
              <a
                href={whatsappLink(vcard.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/20"
              >
                <MessageCircle className="size-4 text-emerald-400" />
                WhatsApp
              </a>
            ) : null}
            {vcard.email ? (
              <a
                href={`mailto:${vcard.email}`}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs font-medium text-white transition hover:bg-white/10"
              >
                <Mail className="size-4 text-indigo-400" />
                Correo
              </a>
            ) : null}
            {vcard.website ? (
              <a
                href={vcard.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs font-medium text-white transition hover:bg-white/10"
              >
                <Globe className="size-4 text-indigo-400" />
                Sitio web
              </a>
            ) : null}
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs font-medium text-white transition hover:bg-white/10"
              >
                <MapPin className="size-4 text-indigo-400" />
                Mapa
              </a>
            ) : null}
          </div>

          {/* Detailed contact rows */}
          <div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm">
            {vcard.phone ? (
              <a
                href={`tel:${vcard.phone}`}
                className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/5"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-indigo-400">
                  <Phone className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-slate-400">Teléfono</div>
                  <div className="truncate font-medium text-white">{vcard.phone}</div>
                </div>
              </a>
            ) : null}

            {vcard.whatsapp ? (
              <a
                href={whatsappLink(vcard.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/5"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <MessageCircle className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-slate-400">WhatsApp</div>
                  <div className="truncate font-medium text-white">{vcard.whatsapp}</div>
                </div>
              </a>
            ) : null}

            {vcard.email ? (
              <a
                href={`mailto:${vcard.email}`}
                className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/5"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-indigo-400">
                  <Mail className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-slate-400">Correo electrónico</div>
                  <div className="truncate font-medium text-white">{vcard.email}</div>
                </div>
              </a>
            ) : null}

            {vcard.website ? (
              <a
                href={vcard.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/5"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-indigo-400">
                  <Globe className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-slate-400">Sitio web</div>
                  <div className="truncate font-medium text-white">{vcard.website}</div>
                </div>
              </a>
            ) : null}

            {vcard.address ? (
              <a
                href={mapsUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/5"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-indigo-400">
                  <MapPin className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-slate-400">Dirección</div>
                  <div className="font-medium text-white">{vcard.address}</div>
                </div>
              </a>
            ) : null}
          </div>

          <a
            href={`/p/${encodeURIComponent(slug)}/vcard`}
            download={downloadFile}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-500"
          >
            <UserCheck className="size-4" />
            Guardar en Contactos ({downloadFile})
          </a>
        </div>
      </div>

      <footer className="mt-8 flex justify-center">
        <a
          href="https://alkonpos.com"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-4 py-1.5 text-[11px] font-semibold tracking-[0.16em] text-white/85 uppercase shadow-md backdrop-blur-md transition-all hover:scale-105 hover:border-white/35 hover:bg-black/55 hover:text-white"
        >
          <Sparkles className="size-3.5 text-sky-400 transition-transform group-hover:rotate-12" />
          <span>
            POWERED BY <strong className="font-extrabold text-white">ALKONPOS</strong>
          </span>
        </a>
      </footer>
    </div>
  );
}
