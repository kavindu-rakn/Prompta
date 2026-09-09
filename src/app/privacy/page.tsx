import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Prompta",
  description: "What Prompta stores, why, and how to get it deleted.",
};

const LAST_UPDATED = "9 September 2026";

export default function PrivacyPolicy() {
  return (
    <main className="container" style={{ maxWidth: "820px" }}>
      <h1 style={{ fontSize: "clamp(1.8rem, 5vw, 2.8rem)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-1px", marginBottom: "0.5rem" }}>
        Privacy Policy
      </h1>
      <p style={{ opacity: 0.6, marginBottom: "3rem" }}>Last updated: {LAST_UPDATED}</p>

      <section style={{ lineHeight: 1.8 }}>
        <p style={{ marginBottom: "2rem" }}>
          Prompta stores the AI prompts you write, so this policy is mostly about
          one thing: what happens to that text. The short version is that it is
          stored so you can read it back, shared only with people you explicitly
          send it to, never sold, and deleted when you delete it.
        </p>

        <h2 style={{ marginTop: "3rem", marginBottom: "1rem" }}>What we store</h2>
        <ul style={{ paddingLeft: "1.5rem", marginBottom: "2rem" }}>
          <li style={{ marginBottom: "0.75rem" }}>
            <strong>Account.</strong> Your email address, and which method you signed in
            with (Google, or an emailed magic link). Handled by Supabase Auth. We never
            see or store a password, because Prompta does not use passwords.
          </li>
          <li style={{ marginBottom: "0.75rem" }}>
            <strong>Your content.</strong> Prompt titles and bodies, folder names, and any
            file you attach to a prompt.
          </li>
          <li style={{ marginBottom: "0.75rem" }}>
            <strong>Sharing records.</strong> When you send a prompt, we store your email
            address, the recipient&apos;s email address, and which prompt was sent.
          </li>
          <li style={{ marginBottom: "0.75rem" }}>
            <strong>Diagnostics.</strong> If the app throws an error while you are signed
            in, we record the error message, the technical stack trace, the page URL, your
            browser&apos;s user-agent string, and your user ID. These are used to fix bugs
            and nothing else. An error message can quote surrounding application state, so
            these records are readable only by the operator, never by other users.
          </li>
        </ul>

        <h2 style={{ marginTop: "3rem", marginBottom: "1rem" }}>What we do not do</h2>
        <p style={{ marginBottom: "2rem" }}>
          There is no advertising, no analytics or tracking pixels, no behavioural
          profiling, and no third-party tracking cookies. Your prompts are not sold,
          rented, or used to train any model.
        </p>

        <h2 style={{ marginTop: "3rem", marginBottom: "1rem" }}>Encryption, stated plainly</h2>
        <p style={{ marginBottom: "2rem" }}>
          Traffic is encrypted in transit (HTTPS), and data is encrypted at rest by our
          hosting providers. Prompta is <strong>not</strong> end-to-end encrypted. Your
          prompts are stored in a way the operator could technically read, in the same way
          any ordinary database-backed application can. If a prompt contains something you
          would not put in a normal web app, do not put it here.
        </p>

        <h2 style={{ marginTop: "3rem", marginBottom: "1rem" }}>Who else processes your data</h2>
        <ul style={{ paddingLeft: "1.5rem", marginBottom: "2rem" }}>
          <li style={{ marginBottom: "0.75rem" }}><strong>Supabase</strong> — database, file storage, and authentication.</li>
          <li style={{ marginBottom: "0.75rem" }}><strong>Vercel</strong> — application hosting. Vercel keeps standard server request logs, which include IP addresses.</li>
          <li style={{ marginBottom: "0.75rem" }}><strong>Google</strong> — only if you choose to sign in with Google, and only to confirm your identity.</li>
        </ul>

        <h2 style={{ marginTop: "3rem", marginBottom: "1rem" }}>Storage in your browser</h2>
        <p style={{ marginBottom: "2rem" }}>
          Prompta keeps two things in your browser&apos;s local storage: your login session
          token, and your light/dark theme choice. Both stay on your device. Clearing site
          data signs you out and resets the theme.
        </p>

        <h2 style={{ marginTop: "3rem", marginBottom: "1rem" }}>Sharing a prompt</h2>
        <p style={{ marginBottom: "2rem" }}>
          Sending a prompt to an email address makes that prompt, and any file attached to
          it, readable by whoever is signed in with that address. No email notification is
          sent — the recipient sees it in their Prompta inbox. If you send to an address
          that has never registered, the record waits, and whoever later registers that
          address will be able to read it. Check the address before you send.
        </p>

        <h2 style={{ marginTop: "3rem", marginBottom: "1rem" }}>Keeping and deleting</h2>
        <p style={{ marginBottom: "2rem" }}>
          Your content is kept until you delete it. Deleting a prompt also deletes its
          attached file. Diagnostic records are kept while they are useful for debugging.
          To delete your entire account and everything in it, contact us at the address
          below and we will erase it.
        </p>

        <h2 style={{ marginTop: "3rem", marginBottom: "1rem" }}>Your rights</h2>
        <p style={{ marginBottom: "2rem" }}>
          You can ask for a copy of your data, ask for corrections, or ask for deletion.
          Depending on where you live, you may also have the right to object to processing
          or to complain to a data protection authority. Use the contact address below.
        </p>

        <h2 style={{ marginTop: "3rem", marginBottom: "1rem" }}>Children</h2>
        <p style={{ marginBottom: "2rem" }}>
          Prompta is not intended for children under 16, and we do not knowingly collect
          their data.
        </p>

        <h2 style={{ marginTop: "3rem", marginBottom: "1rem" }}>Changes</h2>
        <p style={{ marginBottom: "2rem" }}>
          If this policy changes materially, the date at the top of this page changes with
          it.
        </p>

        <h2 style={{ marginTop: "3rem", marginBottom: "1rem" }}>Contact</h2>
        <p style={{ marginBottom: "2rem" }}>
          Questions, data requests, or account deletion: <strong>kavindu.rakn@gmail.com</strong>
          <br />
          Data controller: <strong>kavindu-rakn</strong>
        </p>
      </section>

      <p style={{ marginTop: "4rem", paddingTop: "2rem", borderTop: "2px solid var(--border-color)" }}>
        <Link href="/" style={{ color: "var(--text-color)" }}>[ RETURN TO PROMPTA ]</Link>
        {"  "}
        <Link href="/terms" style={{ color: "var(--text-color)", marginLeft: "1.5rem" }}>[ TERMS OF SERVICE ]</Link>
      </p>
    </main>
  );
}
