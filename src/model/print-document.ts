import { PrintContent } from "./print-content";
import { PrintMargin } from "./print-margin";

export interface PrintDocument {
  content: PrintContent;
  header: PrintContent;
  footer: PrintContent;
  margin: PrintMargin;
  fileName: string;
}
