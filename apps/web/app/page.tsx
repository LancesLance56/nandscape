import {Hero} from "@/components/hero";
import {Navbar} from "@/components/navbar";

export default function Home() {
  return (
    <>
      <Navbar/>
      <main className="mx-auto max-w-330 px-6 sm:px-10">
        <Hero/>
      </main>
    </>
  );
}