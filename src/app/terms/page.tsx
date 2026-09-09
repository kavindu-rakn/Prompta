import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Prompta",
  description: "The rules for using Prompta, and the limits of what it promises.",
};

const LAST_UPDATED = "9 September 2026";

export default function TermsOfService() {
  return (
    <main className="container" style={{ maxWidth: "820px" }}>
      <h1 style={{ fontSize: "clamp(1.8rem, 5vw, 2.8rem)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-1px", marginBottom: "0.5rem" }}>
        Terms of Service
      </h1>
      <p style={{ opacity: 0.6, marginBottom: "3rem" }}>Last updated: {LAST_UPDATED}</p>

      <section style={{ lineHeight: 1.8 }}>
        <p style={{ marginBottom: "2rem" }}>
          By using Prompta you agree to what follows. If you do not, please do not use it.
        </p>

        <h2 style={{ marginTop: "3rem", marginBottom: "1rem" }}>What Prompta is</h2>
        <p style={{ marginBottom: "2rem" }}>
          Prompta is a tool for storing and organising AI prompts. It is offered free of
          charge, with no service level agreement, no uptime guarantee, and no promise of
          continued availability. Treat it as a convenience, not as your only copy of
          anything you cannot afford to lose. Keep your own backups of prompts that matter.
        </p>

        <h2 style={{ marginTop: "3rem", marginBottom: "1rem" }}>Your account</h2>
        <p style={{ marginBottom: "2rem" }}>
          You need a working email address to sign in. You are responsible for activity
          under your account and for keeping access to your email secure, since anyone who
          can read your email can sign in as you.
        </p>

        <h2 style={{ marginTop: "3rem", marginBottom: "1rem" }}>Your content stays yours</h2>
        <p style={{ marginBottom: "2rem" }}>
          You keep all rights to the prompts and files you upload. You grant us only the
          permission needed to run the service: to store your content, display it back to
          you, and deliver it to the specific people you choose to send it to. Nothing
          more. We do not use your content to train models.
        </p>

        <h2 style={{ marginTop: "3rem", marginBottom: "1rem" }}>Acceptable use</h2>
        <p style={{ marginBottom: "1rem" }}>Do not:</p>
        <ul style={{ paddingLeft: "1.5rem", marginBottom: "2rem" }}>
          <li style={{ marginBottom: "0.75rem" }}>upload anything unlawful, or anything you have no right to upload;</li>
          <li style={{ marginBottom: "0.75rem" }}>upload malware, or use the file storage as a general-purpose file host or CDN;</li>
          <li style={{ marginBottom: "0.75rem" }}>send unsolicited or bulk prompts to people who did not ask for them;</li>
          <li style={{ marginBottom: "0.75rem" }}>attempt to access another user&apos;s data, or to bypass or probe access controls;</li>
          <li style={{ marginBottom: "0.75rem" }}>automate load that degrades the service for other people.</li>
        </ul>
        <p style={{ marginBottom: "2rem" }}>
          Found a security problem? Please report it to the contact address in the{" "}
          <Link href="/privacy" style={{ color: "var(--text-color)" }}>Privacy Policy</Link>{" "}
          rather than exploiting it. Good-faith reports are welcome.
        </p>

        <h2 style={{ marginTop: "3rem", marginBottom: "1rem" }}>Current limits</h2>
        <p style={{ marginBottom: "1rem" }}>
          These are enforced by the service and may change:
        </p>
        <ul style={{ paddingLeft: "1.5rem", marginBottom: "2rem" }}>
          <li style={{ marginBottom: "0.75rem" }}>Prompt title: 200 characters. Prompt body: 100,000 characters.</li>
          <li style={{ marginBottom: "0.75rem" }}>One attachment per prompt, 10&nbsp;MB maximum, limited to common image, PDF, text, Markdown and JSON formats.</li>
          <li style={{ marginBottom: "0.75rem" }}>Sharing: 20 prompts per hour and 100 per day, and the same prompt can only be sent to a given address once.</li>
        </ul>

        <h2 style={{ marginTop: "3rem", marginBottom: "1rem" }}>Sharing</h2>
        <p style={{ marginBottom: "2rem" }}>
          When you send a prompt to an email address, the person signed in with that
          address can read it and open its attachment. Please note that self-service
          removal of a prompt you have already sent is not yet available in the interface.
          Send carefully, and check the address first.
        </p>

        <h2 style={{ marginTop: "3rem", marginBottom: "1rem" }}>Ending things</h2>
        <p style={{ marginBottom: "2rem" }}>
          You may stop using Prompta at any time and request deletion of your account. We
          may suspend or remove accounts that breach these terms, or that put the service
          or its other users at risk.
        </p>

        <h2 style={{ marginTop: "3rem", marginBottom: "1rem" }}>No warranty</h2>
        <p style={{ marginBottom: "2rem" }}>
          Prompta is provided &quot;as is&quot; and &quot;as available&quot;, without
          warranties of any kind, whether express or implied, including fitness for a
          particular purpose and uninterrupted or error-free operation.
        </p>

        <h2 style={{ marginTop: "3rem", marginBottom: "1rem" }}>Limitation of liability</h2>
        <p style={{ marginBottom: "2rem" }}>
          To the fullest extent permitted by law, we are not liable for any indirect,
          incidental, or consequential damages, nor for lost profits, lost data, or lost
          content arising from your use of Prompta. Nothing here limits liability that
          cannot lawfully be limited.
        </p>

        <h2 style={{ marginTop: "3rem", marginBottom: "1rem" }}>Changes</h2>
        <p style={{ marginBottom: "2rem" }}>
          These terms may change. The date at the top of this page will change with them,
          and continuing to use Prompta means accepting the current version.
        </p>

      </section>

      <p style={{ marginTop: "4rem", paddingTop: "2rem", borderTop: "2px solid var(--border-color)" }}>
        <Link href="/" style={{ color: "var(--text-color)" }}>[ RETURN TO PROMPTA ]</Link>
        {"  "}
        <Link href="/privacy" style={{ color: "var(--text-color)", marginLeft: "1.5rem" }}>[ PRIVACY POLICY ]</Link>
      </p>
    </main>
  );
}
