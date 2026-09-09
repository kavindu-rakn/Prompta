import Link from "next/link";

/**
 * Compact legal links. These must stay reachable from the signed-out landing
 * page: Google requires a discoverable privacy policy for a verified OAuth app.
 */
export default function LegalLinks({ style }: { style?: React.CSSProperties }) {
  const linkStyle: React.CSSProperties = {
    color: "inherit",
    textDecoration: "none",
    opacity: 0.55,
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "1.25rem",
        flexWrap: "wrap",
        fontSize: "0.7rem",
        letterSpacing: "1px",
        textTransform: "uppercase",
        fontWeight: "bold",
        ...style,
      }}
    >
      <Link href="/privacy" style={linkStyle}>[ PRIVACY ]</Link>
      <Link href="/terms" style={linkStyle}>[ TERMS ]</Link>
    </div>
  );
}
