"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Tells the widget tree it is inside an iframe, so it can drop its packaging.
 *
 * An embed is already a box: the host page drew a border round the iframe and
 * gave it a caption. Drawing our own card inside that one puts a border inside
 * a border and repeats a heading the host just wrote, which is what makes an
 * embed look bolted on.
 *
 * This is a context rather than a prop because it has to reach a component
 * nobody passes props to. Widgets call WidgetFrame themselves, several layers
 * down, and there are sixteen of them, so threading a `bare` prop through each
 * one would be sixteen edits now and another for every widget added later. A
 * provider at the root of the embed page covers all of them, including the
 * ones that do not exist yet.
 */
const EmbedChromeContext = createContext(false);

export function EmbedChromeProvider({ children }: { children: ReactNode }) {
  return <EmbedChromeContext.Provider value={true}>{children}</EmbedChromeContext.Provider>;
}

/** True when the tree is being rendered inside an embed iframe. */
export function useIsEmbedded(): boolean {
  return useContext(EmbedChromeContext);
}
