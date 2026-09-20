export function Art({
  sheet,
  index,
  className = "",
}: {
  sheet: "cards" | "enemies" | "companions";
  index: number;
  className?: string;
}) {
  const columns = sheet === "companions" ? 3 : 4,
    rows = sheet === "companions" ? 1 : 3;
  return (
    <span aria-hidden="true" className={`art ${className}`}>
      <span
        className={`art-image ${sheet}`}
        style={{
          backgroundImage: `url(/assets/${sheet}.webp)`,
          backgroundSize: `${columns * 100}% ${rows * 100}%`,
          backgroundPosition: `${((index % columns) * 100) / (columns - 1)}% ${rows === 1 ? 50 : (Math.floor(index / columns) * 100) / (rows - 1)}%`,
        }}
      />
    </span>
  );
}
