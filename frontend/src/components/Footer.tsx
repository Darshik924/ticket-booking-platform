import Link from "next/link";

const footerMem = {
  title: "Project By",
  members: [
    { label: "Naresh Choudhary", href: "#" },
    { label: "Darshik Ladhe", href: "#" },
    { label: "Harshal Karanje", href: "#" },
    { label: "Atharva Vyas", href: "#" },
  ],
};

const Footer = () => {
  return (
    <footer className="bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
          {/* Brand */}
          <div className="max-w-md">
            <Link
              href="/"
              className="text-4xl font-bold tracking-tight sm:text-5xl"
            >
              TicketBook<sup className="text-base align-super">®</sup>
            </Link>

            <p className="mt-6 text-base text-white/60 sm:text-lg">
              By continuing past this page, you agree to our{" "}
              <Link href="#" className="underline hover:text-white">
                terms of use
              </Link>
              .
            </p>
          </div>

          {/* Divider (mobile only) */}
          <div className="h-px w-full bg-white/10 md:hidden" />

          {/* Team */}
          <div>
            <p className="text-lg font-semibold text-white sm:text-xl">
              {footerMem.title}
            </p>
            <ul className="mt-5 space-y-4">
              {footerMem.members.map((mem) => (
                <li key={mem.label}>
                  <Link
                    href={mem.href}
                    className="text-base text-white/70 transition hover:text-white sm:text-lg"
                  >
                    {mem.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom divider + copyright */}
        <div className="mt-14 border-t border-white/10 pt-6">
          <p className="text-sm text-white/40">
            © {new Date().getFullYear()} TicketBook. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
