import { Oswald, Playfair_Display, Work_Sans } from "next/font/google";

const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], style: ["normal", "italic"] });
const workSans = Work_Sans({ variable: "--font-work-sans", subsets: ["latin"] });
const oswald = Oswald({ variable: "--font-oswald", subsets: ["latin"] });

// Applied to the public layout wrapper and to anything rendered outside it (the full-screen
// menu is portalled to <body>), so both resolve the same font variables.
export const PUBLIC_FONT_CLASS = `${playfair.variable} ${workSans.variable} ${oswald.variable}`;
