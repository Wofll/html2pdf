import { PrintContent } from "./print-content";

export interface PrintDocument {
    content: PrintContent,
    header:PrintContent,
    footer:PrintContent
  }