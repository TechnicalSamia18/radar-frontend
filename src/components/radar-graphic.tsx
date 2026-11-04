// Decorative animated radar for the landing page.
// Pure SVG + CSS animation (see .radar-sweep in globals.css), so it costs no
// JavaScript and stops moving for users who prefer reduced motion.

// Blip positions (x, y) inside a 400×400 box centred on (200, 200).
const BLIPS: Array<[number, number, "bright" | "dim"]> = [
  [215, 70, "bright"],
  [295, 170, "bright"],
  [120, 100, "dim"],
  [85, 165, "dim"],
  [130, 220, "dim"],
  [70, 280, "dim"],
  [310, 275, "dim"],
  [240, 285, "dim"],
  [130, 340, "dim"],
  [255, 355, "dim"],
];

export function RadarGraphic() {
  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <svg viewBox="0 0 400 400" role="img" aria-label="A radar sweeping over dots that stand for software houses" className="w-full">
        {/* Three rings, darkest on the outside. */}
        <circle cx="200" cy="200" r="195" className="fill-stormy/40 stroke-cloud/40" strokeWidth="1" />
        <circle cx="200" cy="200" r="150" className="fill-stormy/70 stroke-cloud/50" strokeWidth="1" />
        <circle cx="200" cy="200" r="100" className="fill-evening/60 stroke-cloud/50" strokeWidth="1" />

        {/* Rotating sweep: a 55° wedge plus its leading edge. */}
        <g className="radar-sweep">
          <path d="M200 200 L200 5 A195 195 0 0 1 359.7 88.2 Z" className="fill-sunset/45" />
          <line x1="200" y1="200" x2="359.7" y2="88.2" className="stroke-rose" strokeWidth="1.5" />
        </g>

        {BLIPS.map(([x, y, tone], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={tone === "bright" ? 7 : 5}
            className={tone === "bright" ? "fill-beige radar-blip" : "fill-cloud"}
            style={tone === "bright" ? { animationDelay: `${i * 0.8}s` } : undefined}
          />
        ))}

        {/* The "found one" blip with a halo. */}
        <circle cx="275" cy="105" r="18" className="fill-none stroke-beige" strokeWidth="1.5" />
        <circle cx="275" cy="105" r="9" className="fill-beige" />
        <circle cx="200" cy="200" r="7" className="fill-beige" />
      </svg>

      {/* Example match card. Sample data — a fictional opening, labelled as such for screen readers. */}
      <div className="absolute bottom-[4%] right-0 bg-beige px-4 py-2 text-sm text-evening sm:right-[-2%]">
        <span className="sr-only">Example: </span>
        <p className="font-normal">Frontend intern</p>
        <p className="text-sunset">82% fit · Lahore</p>
      </div>
    </div>
  );
}
