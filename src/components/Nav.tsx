import Link from "next/link";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/clientes", label: "Clientes" },
  { href: "/distribuidores", label: "Distribuidores" },
  { href: "/tecnicos", label: "Tecnicos" },
  { href: "/localidades", label: "Localidades" },
];

export function Nav() {
  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
        <span className="font-semibold">CRM Turina</span>
        <ul className="flex gap-4 text-sm">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-black/70 hover:text-black hover:underline dark:text-white/70 dark:hover:text-white"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
