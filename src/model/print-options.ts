import { PaperOrientation } from "./paper-orientation";
import { PrintMargin } from "./print-margin";

export interface PrintOptions {
    paperSize: string;
    orientation: PaperOrientation;
    margin: PrintMargin;
  }
  