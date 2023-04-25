import { PrintContent } from "./print-content";
import { PrintOptions } from "./print-options";

export interface PrintDocument {
  content: PrintContent;
  header: PrintContent;
  footer: PrintContent;
  printOptions: PrintOptions;
  fileName: string;
}
