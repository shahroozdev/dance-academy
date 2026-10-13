"use client";

import Image from "next/image";

import { Modal } from "@/components/common/modal";
import type { PublicProfile } from "@/types/content";

type InstructorCardsProps = {
  instructors: readonly PublicProfile[];
};

/** The client requested founder cards; the complete biography stays available without lengthening the page. */
export function InstructorCards({ instructors }: InstructorCardsProps) {
  return (
    <ul className="grid w-full gap-6 sm:grid-cols-2">
      {instructors.map((instructor) => (
        <li key={instructor.name}>
          <Modal
            title={instructor.name}
            className="max-h-[85dvh] max-w-2xl overflow-y-auto"
            trigger={
              <button
                type="button"
                className="group flex h-full w-full flex-col items-center gap-5 border border-primary/30 bg-card p-8 text-center shadow-sm transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {instructor.photo && (
                  <div className="relative aspect-square w-full overflow-hidden rounded-full">
                    <Image
                      src={instructor.photo.src}
                      alt={instructor.photo.alt}
                      fill
                      sizes="(min-width: 640px) 22rem, 85vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      style={{ objectPosition: instructor.photo.position }}
                    />
                  </div>
                )}
                <div className="flex flex-col items-center gap-2">
                  <h2 className="font-public text-2xl font-light tracking-wide text-foreground uppercase">{instructor.name}</h2>
                  <p className="font-display text-xl text-primary italic">{instructor.title}</p>
                </div>
                <p className="font-public text-sm leading-relaxed text-muted-foreground">{instructor.summary}</p>
                <span className="font-condensed text-sm font-semibold tracking-widest text-primary uppercase">Read Biography</span>
              </button>
            }
          >
            {() => (
              <article className="flex flex-col gap-6">
                <div className="flex flex-wrap gap-2" aria-label={`${instructor.name} specializations`}>
                  {instructor.specializations.map((specialization) => (
                    <span
                      key={specialization}
                      className="border border-primary/30 px-3 py-1 font-condensed text-xs tracking-widest text-foreground uppercase"
                    >
                      {specialization}
                    </span>
                  ))}
                </div>
                {instructor.biography.map((paragraph) => (
                  <p key={paragraph} className="font-public leading-relaxed text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
              </article>
            )}
          </Modal>
        </li>
      ))}
    </ul>
  );
}
