import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import React from "react";

/**
 * Only the chrome every tutorials route shares. The sidebar deliberately
 * lives one level down (app/tutorials/[track]/layout.tsx) rather than here:
 * the directory page at /tutorials is itself the index, so putting a
 * duplicate index next to it was just noise.
 */
export default function TutorialsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
