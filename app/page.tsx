import { logoutAction } from "@/actions/auth/authActions";
import Button from "@/components/Button";
import { getMe } from "@/services/auth/authService";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Home() {
  // proxy.ts only checks that the cookie exists; getMe asks the backend
  // whether the session is real and not expired.
  const sessionId = (await cookies()).get("session")?.value;
  const user = sessionId ? await getMe(sessionId) : null;
  if (!user) redirect("/session-expired");

  return (
    <>
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
        <span className="font-semibold">My App</span>
        <form action={logoutAction}>
          <Button type="submit">Log out</Button>
        </form>
      </header>
      <main className="flex flex-col flex-1 items-center justify-center gap-2 bg-zinc-50 font-sans dark:bg-black">
        <h1 className="text-2xl font-semibold">Home</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Hello, {user.username}
        </p>
        <Link href="/user" className="underline">
          User info
        </Link>
        <Link href="/addresses" className="underline">
          Addresses
        </Link>
      </main>
    </>
  );
}
