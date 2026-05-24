import { LandingForm } from "@/components/landing-form";

export default function Home() {
  return (
    <main className="flex-1 w-full flex flex-col items-center px-6 py-12 sm:py-20">
      <div className="w-full max-w-3xl flex flex-col gap-10">
        <header className="flex flex-col gap-4 text-center sm:text-left">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-balance">
            What&apos;s your <span className="text-emerald-600 dark:text-emerald-400">next role</span>?
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl">
            Tell us what you do in a paragraph. We&apos;ll find jobs you can land today
            — and the next tier up, with exactly what skills you&apos;d need to unlock them.
          </p>
        </header>

        <LandingForm />

        <footer className="text-xs text-muted-foreground border-t pt-6 flex flex-wrap items-center gap-3 justify-between">
          <span>
            Open source ·{" "}
            <a
              href="https://github.com/l69d/levelup"
              className="underline underline-offset-2 hover:text-foreground"
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/l69d/levelup
            </a>
          </span>
          <span>MIT license</span>
        </footer>
      </div>
    </main>
  );
}
