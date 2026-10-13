// Static content for the public website. Text comes from the client's redesign brief
// (docs/Malhaar_Website_Redesign.docx); photos and videos are served from the Cloudinary bucket.
//
// Festivals, performances, press items, founder profiles, and the contact/social details can now
// be managed in the Content Portal (/content). The versions here are what the website shows until
// that content exists in the portal — see src/actions/public-content.ts.

import type { PublicFestival, PublicProfile, PublicSiteSettings } from "@/types/content";

// The site's own photos and videos are kept in the Cloudinary bucket, not in this repository.
// These build the address of one of them from its name.
const SITE_FILES_BUCKET = "https://res.cloudinary.com/dgrg5yzfy";
export const siteImage = (name: string) => `${SITE_FILES_BUCKET}/image/upload/malhaar/website/site/images/${name}`;
export const siteVideo = (name: string) => `${SITE_FILES_BUCKET}/video/upload/malhaar/website/site/media/${name}`;

export const SITE_NAME = "Malhaar Dance Company";
export const SITE_EMAIL = "vsmalhaar@gmail.com";
export const SITE_PHONE = "224-386-5273";
export const SITE_WHATSAPP_URL = "https://wa.me/12243865273";
export const SITE_SOCIAL_LINKS = [
  { href: "https://www.facebook.com/dancemalhaar/", label: "Facebook" },
  { href: "https://www.instagram.com/dance_malhaar/", label: "Instagram" },
] as const;
export const SITE_LOCATIONS = ["Wood Dale", "Elgin"] as const;
export const SITE_LOCATION_LINE = `${SITE_LOCATIONS.join(" & ")}, Illinois`;

export const SITE_DESCRIPTION =
  "Malhaar Dance Company offers Bharatanatyam, Mohiniyattam, Bollywood/Cinematic, and adult Semi Classical dance training in Wood Dale and Elgin, Illinois, and presents performances and the Malhaar Ananta Arts Festival.";

export const HOME_INTRO = `${SITE_NAME} is a performing dance training organization in the Chicagoland area, rooted in Indian classical traditions while embracing contemporary and cinematic expressions.`;

// The site details shown until a Content Owner saves their own in the Content Portal's Website
// Settings. Pages read them through getPublicSiteSettings (src/actions/public-content.ts).
export const DEFAULT_SITE_SETTINGS: PublicSiteSettings = {
  email: SITE_EMAIL,
  phone: SITE_PHONE,
  whatsappUrl: SITE_WHATSAPP_URL,
  socialLinks: [...SITE_SOCIAL_LINKS],
  seoDescription: SITE_DESCRIPTION,
  homeIntro: HOME_INTRO,
};

// The main menu, in the order the brief lists it.
export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/training", label: "Training" },
  { href: "/instructors", label: "Instructors" },
  { href: "/performances", label: "Performances" },
  { href: "/ananta", label: "Ananta Festival" },
  { href: "/press", label: "Press & Media" },
  { href: "/support", label: "Support" },
  { href: "/contact", label: "Contact" },
] as const;

// One entry per full-screen section on the home page, in scroll order. Drives the dot navigator.
export const HOME_SECTIONS = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "training", label: "Training" },
  { id: "instructors", label: "Instructors" },
  { id: "performances", label: "Performances" },
  { id: "ananta", label: "Ananta Festival" },
  { id: "press", label: "Press & Media" },
  { id: "support", label: "Support" },
  { id: "contact", label: "Contact" },
] as const;

export type HomeSectionId = (typeof HOME_SECTIONS)[number]["id"];

/** Link to the contact page with the inquiry form's "Interested In" already chosen. */
export const inquiryHref = (interest: string) => `/contact?interest=${encodeURIComponent(interest)}`;

// ---------- About ----------

export const ABOUT_STORY = [
  "Malhaar Dance Company was founded by sisters Sreevidhya Vijayan and Varsha Vijayan, whose shared journey in dance began at a young age in Oman. With training and performance experience spanning Indian classical and contemporary dance forms, their journey has taken them across stages in Oman, India, and the United States.",
  "Malhaar was created from their shared passion for dance and their desire to build a space where students can receive meaningful training while experiencing the discipline, creativity, expression, and joy of performance.",
  "Today, Malhaar brings together dance education, performances, productions, collaborations, and cultural initiatives in the Chicagoland area.",
] as const;

export const ABOUT_VISION =
  "Our vision is to create a space where tradition, creativity, and artistic expression come together. We aim to provide students with strong foundations while encouraging confidence, discipline, individuality, and a genuine appreciation for the art form. Beyond the classroom, Malhaar seeks to create opportunities for artists and audiences to connect through performances, collaborations, and cultural initiatives.";

export const ABOUT_INTRO =
  "Rooted in Indian classical traditions while embracing contemporary and cinematic expressions, Malhaar provides a space for students and artists to learn, create, perform, and grow.";

export const ABOUT_PILLARS = [
  { title: "Dance Education", href: "/training" },
  { title: "Performances & Productions", href: "/performances" },
  { title: "Malhaar Ananta Arts Festival", href: "/ananta" },
  { title: "Collaborations & Community", href: "/support" },
] as const;

// ---------- Training ----------

export const TRAINING_INTRO =
  "At Malhaar Dance Company, we believe dance education is about more than learning choreography. Our training focuses on developing strong foundations, musicality, expression, discipline, stage confidence, and an understanding of the art form.";

export const TRAINING_AVAILABILITY =
  "Interested in joining Malhaar? Contact us for current class availability, levels, evaluations, and schedules.";

export const TRAINING_PROGRAMS = [
  {
    name: "Bharatanatyam",
    interest: "Bharatanatyam",
    image: siteImage("client/performance-stage-wide-1.jpg"),
    imageAlt: "Malhaar students performing Bharatanatyam on stage",
    summary:
      "A strong foundation in technique, rhythm, coordination, expression, and storytelling, built through structured training in the classical art form.",
    description:
      "Our Bharatanatyam training focuses on building a strong foundation in technique, rhythm, coordination, expression, and storytelling. Students progress through structured training while developing an understanding and appreciation of the classical art form.",
  },
  {
    name: "Mohiniyattam",
    interest: "Mohiniyattam",
    image: siteImage("client/students-onam.jpg"),
    imageAlt: "Malhaar students and teacher at an Onam flower display",
    summary:
      "The fundamental techniques, rhythm, expression, and repertoire of the graceful classical dance tradition from Kerala.",
    description:
      "Our Mohiniyattam training introduces students to the fundamental techniques, rhythm, expression, and repertoire of this graceful classical dance tradition from Kerala while developing an appreciation for its distinctive movement vocabulary and artistic character.",
  },
  {
    name: "Bollywood / Cinematic",
    interest: "Bollywood/Cinematic",
    image: siteImage("client/performance-children-blue.jpg"),
    imageAlt: "Malhaar students performing in blue costumes",
    summary:
      "The energy of Indian cinema with contemporary, folk, and fusion styles, focused on musicality, performance quality, and confidence.",
    description:
      "Our Bollywood and Cinematic Dance program combines the energy of Indian cinema with elements of contemporary, folk, fusion, and popular dance styles. Classes focus on rhythm, coordination, musicality, expressions, performance quality, and confidence.",
  },
  {
    name: "Semi Classical",
    interest: "Semi Classical",
    image: siteImage("client/dancers-orange.jpg"),
    imageAlt: "Malhaar dancers performing in orange costumes",
    summary: "Adult training that brings together the grace of classical Indian dance with expressive contemporary presentation.",
    description:
      "Our Semi Classical program is for adults who would like to explore expressive Indian dance rooted in classical movement while developing musicality, confidence, and performance quality.",
    audience: "Adults",
  },
] as const;

// ---------- Instructors ----------

export const INSTRUCTORS = [
  {
    name: "Sreevidhya Vijayan",
    photo: siteImage("wix/instructor-sreevidhya-vijayan.jpg"),
    title: "Co-Founder & Artistic Director",
    specializations: ["Bharatanatyam", "Mohiniyattam", "Kuchipudi"],
    summary:
      "A trained Indian classical dancer in Bharatanatyam, Mohiniyattam, and Kuchipudi. Natya Idol Champion and recipient of the Guru Shri Adyar K. Lakshman Memorial Prize.",
    biography: [
      "Sreevidhya Vijayan is a trained Indian classical dancer with extensive experience in Bharatanatyam, Mohiniyattam, and Kuchipudi. Her artistic journey has included advanced classical training, competitions, productions, and performances in India and the United States.",
      "Among her recognitions are the Natya Idol Championship and the Guru Shri Adyar K. Lakshman Memorial Prize. She was also a semi-finalist on Amrita TV’s Laasyam. Her performance and choreographic journey includes works such as Rhythm, Story of Ram, Samarpanam, Samaksham, Amma, Ravi Varma, and Seasons.",
      "As Artistic Director of Malhaar Dance Company, Sreevidhya focuses on developing strong classical foundations while creating meaningful performance experiences for students and audiences.",
    ],
  },
  {
    name: "Varsha Vijayan",
    photo: siteImage("wix/instructor-varsha-vijayan.jpg"),
    title: "Co-Founder & Instructor",
    specializations: ["Bharatanatyam", "Kuchipudi", "Mohiniyattam", "Indian Contemporary", "Bollywood", "Hip-Hop", "Fusion"],
    summary:
      "Dancing since the age of four, with training in Bharatanatyam, Kuchipudi, and Mohiniyattam alongside Indian contemporary, Bollywood, hip-hop, and fusion styles.",
    biography: [
      "Varsha Vijayan began her dance journey at the age of four in Oman and has trained in Bharatanatyam, Kuchipudi, and Mohiniyattam, alongside experience in Indian contemporary, Bollywood, hip-hop, and fusion styles.",
      "Over the years, she has performed across Oman, India, and the United States and has had opportunities to share the stage with prominent artists and personalities including Prabhu Deva, Neerav Bavlecha, Shamna Kasim, Kavya Madhavan, and many others. Her dance journey also includes participation in the Soorya Festival and the Prabhu Deva USA Tour in Chicago.",
      "Her recognitions in Oman include Popular Choice at Dance Muscat Dance, Best Dancer at the Center for Performing Arts, Runner-Up at Muscat Festival’s Got Talent, Most Popular at the Khafeef International Dance Festival, and Ms. Talented at Waljat College.",
      "At Malhaar, Varsha brings together her experience across classical, contemporary, and cinematic dance forms, working closely with students in training, choreography, performance preparation, and stage presentation.",
    ],
  },
] as const;

// ---------- Performances ----------

export const PERFORMANCES_INTRO = [
  "Performance is an important part of the Malhaar experience. We believe the stage gives dancers an opportunity to transform their training into expression, confidence, storytelling, and connection with an audience.",
  "Malhaar Dance Company participates in and creates performances ranging from Indian classical dance and cultural presentations to contemporary and cinematic productions.",
] as const;

export const PERFORMANCE_KINDS = [
  "Major Productions",
  "Professional Performances",
  "Collaborations",
  "Cultural Programs",
  "Festivals",
  "Student Performances",
] as const;

// To add a photo to the Performances page, add a line here.
export const PERFORMANCE_PHOTOS = [
  { src: siteImage("client/performance-stage-wide-1.jpg"), alt: "Malhaar students performing on stage" },
  { src: siteImage("client/performance-stage-wide-2.jpg"), alt: "Malhaar students performing together on stage" },
  { src: siteImage("client/performance-children-blue.jpg"), alt: "Malhaar students performing in blue costumes" },
  { src: siteImage("client/performance-yellow-group.jpg"), alt: "Malhaar dancers in yellow costumes" },
  { src: siteImage("client/dancers-orange.jpg"), alt: "Malhaar dancers performing in orange costumes" },
  { src: siteImage("client/students-onam.jpg"), alt: "Malhaar students and teacher at an Onam flower display" },
] as const;

export const ANANTA_MEDIA = [
  { src: siteImage("client/ananta-poster-1-highlight.jpg"), alt: "Malhaar Ananta Arts Festival artwork" },
  { src: siteImage("client/ananta-poster-2-highlight.jpg"), alt: "Sreelakshmy Govardhanan festival artwork" },
] as const;

export const ANANTA_REEL_PATH = siteVideo("ananta-neena-prasad-message.mp4");

// ---------- Malhaar Ananta Arts Festival ----------

export const ANANTA_INTRO = [
  "Ananta represents the infinite — the continuing journey of art, stories, traditions, and expression.",
  "Presented by Malhaar Dance Company, the Malhaar Ananta Arts Festival is an initiative created to bring together exceptional artists, dance enthusiasts, students, families, and the wider community in celebration of Indian performing arts.",
  "Through Malhaar Ananta Arts Festival, we hope to create a platform where distinguished artists can share their work with audiences while inspiring students and the next generation of dancers to experience the depth and beauty of Indian classical arts.",
] as const;

export const ANANTA_FUTURE =
  "Malhaar Ananta Arts Festival is envisioned as more than a single event. Our hope is to grow the Malhaar Ananta Arts Festival into an ongoing platform that brings artists, audiences, students, and communities together through meaningful artistic experiences.";

export type AnantaEdition = {
  year: string;
  label: string;
  date: string;
  time: string;
  /** The same start, as an ISO date-time with its UTC offset, for search engines. */
  startsAt: string;
  venue: string;
  venueName: string;
  venueTown: string;
  summary: string;
  artists: readonly { name: string; form: string }[];
};

// One entry per festival year, newest first. Adding a year here creates its page at
// /ananta/<year> and adds it to the year switcher; earlier years stay available.
export const ANANTA_EDITIONS: readonly AnantaEdition[] = [
  {
    year: "2026",
    label: "Inaugural edition",
    date: "Sunday, October 25, 2026",
    time: "3:00 PM",
    // 3:00 PM US Central; daylight time (UTC-5) is still in effect on this date.
    startsAt: "2026-10-25T15:00:00-05:00",
    venue: "Sycamore High School Auditorium, Sycamore, Illinois",
    venueName: "Sycamore High School Auditorium",
    venueTown: "Sycamore",
    summary:
      "The inaugural edition brings together two distinguished classical dance traditions and includes live musical accompaniment.",
    artists: [
      { name: "Dr. Neena Prasad", form: "Mohiniyattam" },
      { name: "Sreelakshmy Govardhanan", form: "Kuchipudi" },
    ],
  },
];

export const ANANTA_INTEREST = "Malhaar Ananta Arts Festival";
export const ANANTA_TICKETS_URL = "https://www.sycamoretickets.org/";

// The built-in festival pages and founder profiles, in the shape the pages render. They are what
// visitors see until the same content is entered in the Content Portal.
export const BUILT_IN_FESTIVALS: PublicFestival[] = ANANTA_EDITIONS.map((edition) => ({
  ...edition,
  venueRegion: "IL",
  ticketUrl: ANANTA_TICKETS_URL,
  posters: ANANTA_MEDIA,
  gallery: [],
  videos: [{ src: ANANTA_REEL_PATH, title: "A message from Dr. Neena Prasad" }],
  sponsors: [],
}));

export const BUILT_IN_PROFILES: PublicProfile[] = INSTRUCTORS.map((instructor) => ({
  ...instructor,
  photo: { src: instructor.photo, alt: `Portrait of ${instructor.name}` },
}));

// ---------- Press & Media ----------

export const PRESS_INTRO =
  "Malhaar Dance Company’s journey continues to grow through performances, collaborations, cultural initiatives, and engagement with the wider arts community. This section will feature selected press coverage, interviews, articles, performance features, videos, and media highlights.";

export const PRESS_KINDS = [
  "Newspaper & Online Coverage",
  "Interviews",
  "Articles & Features",
  "Performance Videos",
  "Media Appearances",
] as const;

// ---------- Support ----------

export const SUPPORT_INTRO = [
  "Malhaar Dance Company continues to grow through the support of families, artists, businesses, cultural organizations, and members of our community who believe in the importance of keeping the arts thriving.",
  "Whether through sponsorship, partnerships, artistic collaborations, community support, or volunteering, your involvement helps us create meaningful opportunities for artists and students while bringing high-quality performing arts experiences to our community.",
] as const;

