import AddressForm from "./AddressForm";

// Step 2 of signup. Also used later to add another address.
export default function NewAddressPage() {
  return (
    // No background color: the section's backdrop (layout.tsx) must show through
    <main className="flex flex-col flex-1 items-center justify-center gap-4 px-4 py-8 font-sans">
      <div className="flex w-full max-w-sm flex-col gap-1">
        <h1 className="text-2xl font-semibold">Where do you live?</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Search for your address and pick it from the list.
        </p>
      </div>
      <AddressForm />
    </main>
  );
}
