import { PrintHtml } from "./print-html";
import { PrintMargin } from "./print-margin";
import { PrintText } from "./print-text";

export interface PrintContent {
    html:PrintHtml;
    text:PrintText;    
    margin: PrintMargin;
  }