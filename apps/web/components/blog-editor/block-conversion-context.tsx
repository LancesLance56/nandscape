"use client";

import { createContext, useContext } from "react";
import type { ContentBlock } from "@/types/content-block";

/**
 * Lets a block's own Editor (currently only ParagraphBlockEditor, via the
 * slash-command menu) turn itself into a different block type without every
 * BlockDefinition.Editor needing a "convert" callback threaded through its
 * signature. Provided once by BlockList, consumed by whichever block editor
 * needs it.
 */
export type ConvertBlock = (id: string, targetType: ContentBlock["type"]) => void;

const BlockConversionContext = createContext<ConvertBlock>(() => {
  console.warn("[block-conversion-context] convertBlock called outside a BlockList provider");
});

export const BlockConversionProvider = BlockConversionContext.Provider;

export function useBlockConversion(): ConvertBlock {
  return useContext(BlockConversionContext);
}
